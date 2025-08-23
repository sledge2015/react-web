from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import hash_password, verify_password


class UserService:
	"""用户服务类"""
	
	@staticmethod
	def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
		"""根据ID获取用户"""
		return db.query(User).filter(User.id == user_id).first()
	
	@staticmethod
	def get_user_by_username(db: Session, username: str) -> Optional[User]:
		"""根据用户名获取用户"""
		return db.query(User).filter(User.username == username).first()
	
	@staticmethod
	def get_user_by_email(db: Session, email: str) -> Optional[User]:
		"""根据邮箱获取用户"""
		return db.query(User).filter(User.email == email).first()
	
	@staticmethod
	def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
		"""获取用户列表"""
		return db.query(User).offset(skip).limit(limit).all()
	
	@staticmethod
	def create_user(db: Session, user_create: UserCreate) -> User:
		"""创建用户"""
		hashed_password = hash_password(user_create.password)
		db_user = User(
			username=user_create.username,
			email=user_create.email,
			hashed_password=hashed_password
			)
		db.add(db_user)
		db.commit()
		db.refresh(db_user)
		return db_user
	
	@staticmethod
	def update_user(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
		"""更新用户信息"""
		user = UserService.get_user_by_id(db, user_id)
		if not user:
			return None
		
		update_data = user_update.model_dump(exclude_unset=True)
		for field, value in update_data.items():
			setattr(user, field, value)
		
		db.commit()
		db.refresh(user)
		return user
	
	@staticmethod
	def set_user_active(db: Session, user_id: int, is_active: bool) -> Optional[User]:
		"""设置用户激活状态"""
		user = UserService.get_user_by_id(db, user_id)
		if user:
			user.is_active = is_active
			db.commit()
			db.refresh(user)
		return user
	
	@staticmethod
	def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
		"""验证用户身份"""
		user = UserService.get_user_by_username(db, username)
		if not user:
			return None
		if not verify_password(password, user.hashed_password):
			return None
		if not user.is_active:
			return None
		return user
	
	@staticmethod
	def delete_user(db: Session, user_id: int) -> bool:
		"""删除用户"""
		user = UserService.get_user_by_id(db, user_id)
		if user:
			db.delete(user)
			db.commit()
			return True
		return False