from typing import Optional
from datetime import timedelta
from sqlalchemy.orm import Session
from app.core.security import create_access_token, verify_token
from app.services.user_service import UserService
from app.schemas.user import LoginRequest, LoginResponse
from app.models.user import User


class AuthService:
	"""认证服务类"""
	
	@staticmethod
	def login(db: Session, login_data: LoginRequest) -> Optional[LoginResponse]:
		"""用户登录"""
		user = UserService.authenticate_user(
			db, login_data.username, login_data.password
			)
		if not user:
			return None
		
		# 根据 remember 设置 token 有效期
		if login_data.remember:
			expires_delta = timedelta(days=90)  # 记住我 -> 7天
		else:
			expires_delta = timedelta(hours=7)  # 普通登录 -> 2小时
		
		# 创建访问令牌
		access_token = create_access_token(
			data={"sub": user.username},
			expires_delta=expires_delta
			)
		
		return LoginResponse(
			user=user,
			token=access_token,
			token_type="bearer",
			remember=login_data.remember
			)
	
	@staticmethod
	def get_current_user(db: Session, token: str) -> Optional[User]:
		"""根据令牌获取当前用户"""
		username = verify_token(token)
		if username is None:
			return None
		
		user = UserService.get_user_by_username(db, username)
		if user is None or not user.is_active:
			return None
		
		return user
	
	@staticmethod
	def refresh_token(db: Session, current_user: User) -> str:
		"""刷新用户令牌"""
		return create_access_token(data={"sub": current_user.username})