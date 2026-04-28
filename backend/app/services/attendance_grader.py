from app.models.attendance import AttendanceGrade


# Weighted score per grade — used for attendance percentage calculation
GRADE_WEIGHTS: dict[AttendanceGrade, float] = {
    AttendanceGrade.FULL        : 1.00,
    AttendanceGrade.PARTIAL     : 0.50,
    AttendanceGrade.LEFT_EARLY  : 0.25,
    AttendanceGrade.ARRIVED_LATE: 0.25,
    AttendanceGrade.SUSPICIOUS  : 0.00,
    AttendanceGrade.ABSENT      : 0.00,
}


def calculate_grade(scan1: bool, scan2: bool, scan3: bool) -> AttendanceGrade:
    """
    Grade from which of the three scan windows recorded the student.
    SUSPICIOUS = start + end without middle (proxy for integrity review).
    PARTIAL = start+middle only, or middle only (weak but not suspicious).
    """
    s1, s2, s3 = scan1, scan2, scan3

    if s1 and s2 and s3:
        return AttendanceGrade.FULL

    if s1 and s3 and not s2:
        return AttendanceGrade.SUSPICIOUS

    if s1 and s2 and not s3:
        return AttendanceGrade.PARTIAL

    if not s1 and s2 and s3:
        return AttendanceGrade.ARRIVED_LATE

    if s1 and not s2 and not s3:
        return AttendanceGrade.LEFT_EARLY

    if not s1 and s2 and not s3:
        return AttendanceGrade.PARTIAL

    return AttendanceGrade.ABSENT


def calculate_attendance_percentage(grades: list[AttendanceGrade]) -> float:
    """
    Calculate weighted attendance percentage from a list of lecture grades.
    Returns value between 0.0 and 100.0.
    """
    if not grades:
        return 0.0

    total_possible = len(grades) * 1.0
    earned         = sum(GRADE_WEIGHTS[g] for g in grades)
    return round((earned / total_possible) * 100, 1)


def get_grade_for_lecture(
    lecture_id: str,
    student_id: str,
    scan_records: list[dict]  # [{"scan_number": int, "student_id": str}, ...]
) -> AttendanceGrade:
    """
    Given all scan records for a lecture, compute the grade for one student.
    """
    present_in = {r["scan_number"] for r in scan_records if r["student_id"] == student_id}
    return calculate_grade(
        scan1 = 1 in present_in,
        scan2 = 2 in present_in,
        scan3 = 3 in present_in,
    )