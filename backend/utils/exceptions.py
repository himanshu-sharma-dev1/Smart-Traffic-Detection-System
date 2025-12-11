"""
Custom Exceptions and Error Handling
"""
from fastapi import HTTPException, status


class AppException(HTTPException):
    """Base application exception"""
    def __init__(self, detail: str, status_code: int = 400, error_code: str = None):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code


class AuthenticationError(AppException):
    """Authentication related errors"""
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTH_ERROR"
        )


class AuthorizationError(AppException):
    """Authorization related errors"""
    def __init__(self, detail: str = "Access denied"):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN"
        )


class NotFoundError(AppException):
    """Resource not found errors"""
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            detail=f"{resource} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND"
        )


class ValidationError(AppException):
    """Validation errors"""
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR"
        )


class DuplicateError(AppException):
    """Duplicate resource errors"""
    def __init__(self, field: str = "Resource"):
        super().__init__(
            detail=f"{field} already exists",
            status_code=status.HTTP_409_CONFLICT,
            error_code="DUPLICATE"
        )


class DatabaseError(AppException):
    """Database operation errors"""
    def __init__(self, detail: str = "Database operation failed"):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="DB_ERROR"
        )
