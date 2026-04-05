#!/bin/bash

# 元梦大陆部署脚本
# 支持多种操作：install(安装), update(更新), start(启动), restart(重启), stop(停止)

set -e

# 配置
APP_NAME="yuanmeng-odyssey"
APP_DIR="/opt/$APP_NAME"
REPO_URL="https://github.com/yinyayun/yuanmeng-odyssey.git"
NODE_VERSION="20"

# 显示帮助信息
show_help() {
    echo "================================"
    echo "  元梦大陆 - 部署脚本"
    echo "================================"
    echo ""
    echo "用法: sudo bash deploy.sh [命令]"
    echo ""
    echo "命令:"
    echo "  install    首次安装部署（包含系统更新、依赖安装、Nginx配置）"
    echo "  update     更新代码并重新构建"
    echo "  start      启动后端服务"
    echo "  restart    重启后端服务"
    echo "  stop       停止后端服务"
    echo "  status     查看服务状态"
    echo "  logs       查看后端日志"
    echo "  nginx      显示Nginx配置参考"
    echo ""
    echo "示例:"
    echo "  sudo bash deploy.sh install    # 首次部署"
    echo "  sudo bash deploy.sh update     # 更新代码"
    echo "  sudo bash deploy.sh restart    # 重启服务"
    echo ""
}

# 检查root权限
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        echo "请使用 sudo 运行此脚本"
        exit 1
    fi
}

# 检测包管理器
get_pkg_manager() {
    if command -v apt-get &> /dev/null; then
        echo "apt"
    elif command -v yum &> /dev/null; then
        echo "yum"
    elif command -v dnf &> /dev/null; then
        echo "dnf"
    else
        echo "unknown"
    fi
}

# 安装系统依赖
install_system_deps() {
    echo ""
    echo "[1/6] 更新系统..."
    PKG_MANAGER=$(get_pkg_manager)
    
    case $PKG_MANAGER in
        apt)
            apt-get update
            apt-get install -y curl git nginx build-essential python3 g++ make
            ;;
        yum)
            yum update -y
            yum groupinstall -y "Development Tools"
            yum install -y curl git nginx python3 gcc-c++ make
            ;;
        dnf)
            dnf update -y
            dnf groupinstall -y "Development Tools"
            dnf install -y curl git nginx python3 gcc-c++ make
            ;;
        *)
            echo "不支持的系统，请手动安装 curl、git、nginx、build-essential"
            exit 1
            ;;
    esac
}

# 安装 Node.js
install_nodejs() {
    echo ""
    echo "[2/6] 安装 Node.js..."
    if ! command -v node &> /dev/null; then
        PKG_MANAGER=$(get_pkg_manager)
        case $PKG_MANAGER in
            apt)
                curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
                apt-get install -y nodejs
                ;;
            yum|dnf)
                curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
                if [ "$PKG_MANAGER" = "yum" ]; then
                    yum install -y nodejs
                else
                    dnf install -y nodejs
                fi
                ;;
        esac
    fi
    node -v
    npm -v
}

# 安装 PM2
install_pm2() {
    echo ""
    echo "[3/6] 安装 PM2..."
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
}

# 克隆/更新代码
update_code() {
    echo ""
    echo "[4/6] 克隆/更新代码..."
    if [ -d "$APP_DIR" ]; then
        cd $APP_DIR
        git pull
    else
        git clone $REPO_URL $APP_DIR
        cd $APP_DIR
    fi
}

# 安装项目依赖
install_deps() {
    echo ""
    echo "[5/6] 安装项目依赖..."
    cd $APP_DIR
    npm run install:all
}

# 构建前端
build_frontend() {
    echo ""
    echo "[6/6] 构建前端..."
    cd $APP_DIR/frontend
    npm run build
}

# 显示 Nginx 配置提示
show_nginx_config() {
    echo ""
    echo "================================"
    echo "  Nginx 配置参考"
    echo "================================"
    echo ""
    echo "请将以下配置添加到 Nginx 配置文件中："
    echo ""
    echo "# Debian/Ubuntu: /etc/nginx/sites-available/yuanmeng-odyssey"
    echo "# CentOS/RHEL:   /etc/nginx/conf.d/yuanmeng-odyssey.conf"
    echo ""
    cat << 'EOF'
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
    echo ""
    echo "配置完成后执行: nginx -t && systemctl restart nginx"
    echo ""
}

# 启动后端
start_backend() {
    echo ""
    echo "启动后端服务..."
    cd $APP_DIR/backend
    pm2 start src/app.js --name $APP_NAME-backend 2>/dev/null || pm2 restart $APP_NAME-backend
    echo "后端服务已启动"
}

# 重启后端
restart_backend() {
    echo ""
    echo "重启后端服务..."
    pm2 restart $APP_NAME-backend
    echo "后端服务已重启"
}

# 停止后端
stop_backend() {
    echo ""
    echo "停止后端服务..."
    pm2 stop $APP_NAME-backend
    echo "后端服务已停止"
}

# 查看状态
show_status() {
    echo ""
    echo "服务状态:"
    pm2 status $APP_NAME-backend
}

# 查看日志
show_logs() {
    echo ""
    pm2 logs $APP_NAME-backend
}

# 完整安装流程
do_install() {
    check_root
    install_system_deps
    install_nodejs
    install_pm2
    update_code
    install_deps
    build_frontend
    
    echo ""
    echo "================================"
    echo "  安装完成！"
    echo "================================"
    echo ""
    show_nginx_config
    echo ""
    echo "================================"
    echo "  后续步骤"
    echo "================================"
    echo ""
    echo "1. 配置 Nginx（参考上方配置）"
    echo "2. 启动后端: sudo bash deploy.sh start"
    echo ""
}

# 更新流程
do_update() {
    check_root
    update_code
    install_deps
    build_frontend
    restart_backend
    
    echo ""
    echo "================================"
    echo "  更新完成！"
    echo "================================"
    echo ""
}

# 主逻辑
main() {
    case "${1:-}" in
        install)
            do_install
            ;;
        update)
            do_update
            ;;
        start)
            check_root
            start_backend
            ;;
        restart)
            check_root
            restart_backend
            ;;
        stop)
            check_root
            stop_backend
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        nginx)
            show_nginx_config
            ;;
        *)
            show_help
            ;;
    esac
}

main "$@"
