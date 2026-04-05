#!/bin/bash

# 元梦大陆部署脚本
# 用于阿里云服务器一键部署

set -e

echo "================================"
echo "  元梦大陆 - 部署脚本"
echo "================================"

# 配置
APP_NAME="yuanmeng-odyssey"
APP_DIR="/opt/$APP_NAME"
REPO_URL="https://github.com/yinyayun/yuanmeng-odyssey.git"
NODE_VERSION="20"

# 检查root权限
if [ "$EUID" -ne 0 ]; then 
    echo "请使用 sudo 运行此脚本"
    exit 1
fi

echo ""
echo "[1/6] 更新系统..."
apt-get update
apt-get install -y curl git nginx

echo ""
echo "[2/6] 安装 Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi
node -v
npm -v

echo ""
echo "[3/6] 安装 PM2..."
npm install -g pm2

echo ""
echo "[4/6] 克隆/更新代码..."
if [ -d "$APP_DIR" ]; then
    cd $APP_DIR
    git pull
else
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

echo ""
echo "[5/6] 安装依赖..."
npm run install:all

echo ""
echo "[6/6] 构建前端..."
cd $APP_DIR/frontend
npm run build

echo ""
echo "配置 Nginx..."
cat > /etc/nginx/sites-available/$APP_NAME << 'EOF'
server {
    listen 80;
    server_name _;
    
    # 前端静态文件
    location / {
        root /opt/yuanmeng-odyssey/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 上传文件
    location /uploads {
        alias /opt/yuanmeng-odyssey/backend/uploads;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "启动后端服务..."
cd $APP_DIR/backend
pm2 delete $APP_NAME-backend 2>/dev/null || true
pm2 start src/app.js --name $APP_NAME-backend
pm2 save
pm2 startup

echo ""
echo "================================"
echo "  部署完成！"
echo "================================"
echo ""
echo "访问地址: http://$(curl -s ifconfig.me)"
echo ""
echo "常用命令:"
echo "  查看日志: pm2 logs $APP_NAME-backend"
echo "  重启服务: pm2 restart $APP_NAME-backend"
echo "  停止服务: pm2 stop $APP_NAME-backend"
echo ""
