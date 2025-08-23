from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_router

# 创建数据库表
Base.metadata.create_all(bind=engine)


# 创建FastAPI应用
def create_application() -> FastAPI:
	application = FastAPI(
		title=settings.app_name,
		description="API for user registration, login, profile, and admin management",
		version=settings.app_version,
		docs_url=settings.docs_url,
		redoc_url=settings.redoc_url,
		openapi_url=settings.openapi_url,
		debug=settings.debug
		)
	
	# 添加CORS中间件
	application.add_middleware(
		CORSMiddleware,
		allow_origins=["http://localhost:3000",
		               "http://127.0.0.1:3000"],  # 生产环境应该限制为特定域名
		allow_credentials=True,
		allow_methods=["*"],
		allow_headers=["*"],
		)
	
	# 包含API路由
	application.include_router(api_router, prefix=settings.api_v1_str)
	
	return application


# 创建应用实例
app = create_application()


@app.get("/")
async def root():
	"""健康检查端点"""
	return {
		"message": f"Welcome to {settings.app_name}",
		"version": settings.app_version,
		"status": "healthy"
		}