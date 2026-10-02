from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from security import require_admin
from schemas.analytics import AdminAnalyticsOverviewResponse
from services.analytics import (
    get_admin_analytics_overview,
    generate_enrollments_csv,
    generate_certificates_csv,
    generate_courses_performance_csv,
)

router = APIRouter(prefix="/api/admin", tags=["admin-analytics-and-reports"])


@router.get("/analytics/overview", response_model=AdminAnalyticsOverviewResponse)
def get_analytics_overview(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Returns platform-wide analytical overview, KPIs, completion metrics,
    grade distribution, skill intelligence, and trainer performance.
    Admin-only.
    """
    return get_admin_analytics_overview(db)


@router.get("/reports/enrollments/csv")
def download_enrollments_report_csv(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Export all enrollment details as CSV. Admin-only.
    """
    csv_content = generate_enrollments_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=enrollments_report.csv"
        },
    )


@router.get("/reports/certificates/csv")
def download_certificates_report_csv(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Export all issued certificate details as CSV. Admin-only.
    """
    csv_content = generate_certificates_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=certificates_report.csv"
        },
    )


@router.get("/reports/courses-performance/csv")
def download_courses_performance_report_csv(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Export all course performance details as CSV. Admin-only.
    """
    csv_content = generate_courses_performance_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=courses_performance_report.csv"
        },
    )
