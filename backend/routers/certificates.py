import hashlib
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models.user import User
from models.course import Course, CourseEnrollment
from models.certificate import Certificate, CertificateStatus
from schemas.certificate import (
    CertificateIssueRequest,
    CertificateResponse,
    CertificateVerificationResponse,
)
from security import get_current_user, require_admin, require_trainee, require_trainer
from services.completion import evaluate_and_update_course_completion, create_notification

router = APIRouter(prefix="/api", tags=["certificates"])


def _format_certificate_response(cert: Certificate) -> CertificateResponse:
    course_title = cert.course.title if cert.course else f"Course #{cert.course_id}"
    trainee_name = cert.trainee.name if cert.trainee else f"Trainee #{cert.trainee_id}"
    issuer_name = cert.issuer.name if cert.issuer else f"Issuer #{cert.issuer_id}"
    return CertificateResponse(
        id=cert.id,
        certificate_code=cert.certificate_code,
        course_id=cert.course_id,
        course_title=course_title,
        trainee_id=cert.trainee_id,
        trainee_name=trainee_name,
        issuer_id=cert.issuer_id,
        issuer_name=issuer_name,
        issue_date=cert.issue_date,
        status=cert.status,
        grade=cert.grade,
        verification_hash=cert.verification_hash,
        verification_url=f"/verify-certificate?code={cert.certificate_code}"
    )


@router.post("/certificates/issue", response_model=CertificateResponse, status_code=status.HTTP_201_CREATED)
def issue_certificate(
    payload: CertificateIssueRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if user_role not in ["TRAINER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers and admins can issue certificates"
        )

    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # Trainers can only issue for their own courses
    if user_role == "TRAINER" and course.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Trainers can only issue certificates for their own courses"
        )

    # Check trainee enrollment
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == payload.course_id,
        CourseEnrollment.trainee_id == payload.trainee_id
    ).first()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trainee is not enrolled in this course"
        )

    # Check for duplicate certificate
    existing_cert = db.query(Certificate).filter(
        Certificate.course_id == payload.course_id,
        Certificate.trainee_id == payload.trainee_id
    ).first()

    if existing_cert:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A certificate has already been issued for this trainee and course"
        )

    # Evaluate completion requirements
    eval_data = evaluate_and_update_course_completion(db, payload.course_id, payload.trainee_id)
    if not eval_data or not eval_data["is_completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trainee has not completed all course requirements yet"
        )

    grade = payload.grade or eval_data.get("grade") or "Pass"
    now = datetime.now(timezone.utc)

    # Generate unique certificate code
    while True:
        code = f"CERT-CC-{uuid.uuid4().hex[:4].upper()}-{uuid.uuid4().hex[:4].upper()}"
        if not db.query(Certificate).filter(Certificate.certificate_code == code).first():
            break

    # Generate verification hash
    hash_payload = f"{code}:{payload.course_id}:{payload.trainee_id}:{current_user.id}:{now.isoformat()}"
    verification_hash = hashlib.sha256(hash_payload.encode()).hexdigest()

    certificate = Certificate(
        certificate_code=code,
        course_id=payload.course_id,
        trainee_id=payload.trainee_id,
        issuer_id=current_user.id,
        issue_date=now,
        status=CertificateStatus.ACTIVE,
        grade=grade,
        verification_hash=verification_hash
    )
    db.add(certificate)
    db.commit()
    db.refresh(certificate)

    # Notification for trainee
    create_notification(
        db,
        user_id=payload.trainee_id,
        title="Certificate Issued! 🏆",
        message=f"You have been awarded an official certificate for completing '{course.title}' (Code: {code}).",
        type="CERTIFICATE",
        link="/trainee?tab=certificates"
    )

    return _format_certificate_response(certificate)


@router.get("/trainee/certificates", response_model=List[CertificateResponse])
def get_my_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee)
):
    certificates = db.query(Certificate).options(
        joinedload(Certificate.course),
        joinedload(Certificate.trainee),
        joinedload(Certificate.issuer)
    ).filter(
        Certificate.trainee_id == current_user.id
    ).order_by(Certificate.issue_date.desc()).all()

    return [_format_certificate_response(c) for c in certificates]


@router.get("/trainer/courses/{course_id}/certificates", response_model=List[CertificateResponse])
def get_course_certificates(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if user_role == "TRAINER" and course.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: You can only view certificates for your own courses"
        )

    certificates = db.query(Certificate).options(
        joinedload(Certificate.course),
        joinedload(Certificate.trainee),
        joinedload(Certificate.issuer)
    ).filter(
        Certificate.course_id == course_id
    ).order_by(Certificate.issue_date.desc()).all()

    return [_format_certificate_response(c) for c in certificates]


@router.get("/admin/certificates", response_model=List[CertificateResponse])
def get_all_certificates_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    certificates = db.query(Certificate).options(
        joinedload(Certificate.course),
        joinedload(Certificate.trainee),
        joinedload(Certificate.issuer)
    ).order_by(Certificate.issue_date.desc()).all()

    return [_format_certificate_response(c) for c in certificates]


@router.post("/admin/certificates/{certificate_id}/revoke", response_model=CertificateResponse)
def revoke_certificate(
    certificate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    cert = db.query(Certificate).options(
        joinedload(Certificate.course),
        joinedload(Certificate.trainee),
        joinedload(Certificate.issuer)
    ).filter(Certificate.id == certificate_id).first()

    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )

    cert.status = CertificateStatus.REVOKED
    db.commit()
    db.refresh(cert)

    course_title = cert.course.title if cert.course else f"Course #{cert.course_id}"
    create_notification(
        db,
        user_id=cert.trainee_id,
        title="Certificate Revoked ⚠️",
        message=f"Your certificate for '{course_title}' (Code: {cert.certificate_code}) has been revoked by administration.",
        type="ALERT",
        link="/trainee?tab=certificates"
    )

    return _format_certificate_response(cert)


# Public certificate verification
@router.get("/certificates/verify/{certificate_code}", response_model=CertificateVerificationResponse)
def verify_certificate_public(
    certificate_code: str,
    db: Session = Depends(get_db)
):
    cert = db.query(Certificate).options(
        joinedload(Certificate.course),
        joinedload(Certificate.trainee),
        joinedload(Certificate.issuer)
    ).filter(
        Certificate.certificate_code.ilike(certificate_code.strip())
    ).first()

    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found or invalid certificate code"
        )

    course_title = cert.course.title if cert.course else "Unknown Course"
    trainee_name = cert.trainee.name if cert.trainee else "Unknown Trainee"
    issuer_name = cert.issuer.name if cert.issuer else "LearnBridge Certification Authority"

    status_str = cert.status.value if hasattr(cert.status, 'value') else str(cert.status)
    is_valid = (status_str == "ACTIVE")

    return CertificateVerificationResponse(
        certificate_code=cert.certificate_code,
        status=status_str,
        is_valid=is_valid,
        course_title=course_title,
        trainee_name=trainee_name,
        issuer_name=issuer_name,
        issue_date=cert.issue_date,
        grade=cert.grade,
        verification_hash=cert.verification_hash
    )
