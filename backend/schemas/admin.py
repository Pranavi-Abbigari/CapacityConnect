from pydantic import BaseModel


class AdminDashboardResponse(BaseModel):
    total_users: int
    total_trainees: int
    total_trainers: int
    total_courses: int
    total_enrollments: int
    total_attempts: int
