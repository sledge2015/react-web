from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.core.database import get_database
from app.services.auth_service import AuthService
from app.models.user import User


def get_db() -> Generator:
	"""获取数据库会话"""
	try:
		db = get_database()
		yield next(db)
	except Exception as e:
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Database connection failed"
			)


def get_current_user(
		authorization: Optional[str] = Header(None),
		db: Session = Depends(get_db)
		) -> User:
	"""获取当前认证用户"""
	credentials_exception = HTTPException(
		status_code=status.HTTP_401_UNAUTHORIZED,
		detail="Could not validate credentials",
		headers={"WWW-Authenticate": "Bearer"},
		)
	
	if not authorization or not authorization.startswith("Bearer "):
		raise credentials_exception
	
	try:
		token = authorization.split(" ")[1]
	except IndexError:
		raise credentials_exception
	
	user = AuthService.get_current_user(db, token)
	if user is None:
		raise credentials_exception
	
	return user


def get_current_active_user(
		current_user: User = Depends(get_current_user)
		) -> User:
	"""获取当前活跃用户"""
	if not current_user.is_active:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Inactive user"
			)
	return current_user


# 可选：管理员权限依赖（如果有角色系统）
def get_admin_user(
		current_user: User = Depends(get_current_active_user)
		) -> User:
	"""获取管理员用户（示例，需要实际的权限系统）"""
	# 这里可以添加管理员权限检查逻辑
	# 例如：检查用户角色、权限等
	return current_user