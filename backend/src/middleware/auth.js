// Session 认证中间件
export const authMiddleware = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ code: 401, message: '未登录或会话已过期' })
  }
  req.user = req.session.user
  next()
}

// 检查角色权限
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ code: 401, message: '未登录' })
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ code: 403, message: '权限不足' })
    }
    next()
  }
}

// 仅超级管理员
export const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ code: 401, message: '未登录' })
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '仅超级管理员可访问' })
  }
  next()
}

// 检查是否为家庭成员（有家庭ID或是管理员）
export const requireFamilyMember = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ code: 401, message: '未登录' })
  }
  const user = req.session.user
  // 超级管理员可以访问所有
  if (user.role === 'admin') {
    return next()
  }
  // 必须有家庭ID
  if (!user.family_id) {
    return res.status(403).json({ code: 403, message: '您不属于任何家庭' })
  }
  next()
}
