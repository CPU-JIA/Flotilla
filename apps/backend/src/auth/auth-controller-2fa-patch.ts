// 在 AuthController 构造函数中添加 TwoFactorService 注入
// constructor(
//   private authService: AuthService,
//   private usersService: UsersService,
//   private redisService: RedisService,
//   private twoFactorService: TwoFactorService, // 添加这一行
// ) {}

// 在 AuthController 中添加的新方法：

/**
 * 完成 2FA 验证并登录
 * 用户首次登录后，如果启用了 2FA，需要调用此端点完成验证
 */
@Public()
@Post('login/2fa')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: '完成 2FA 验证并登录' })
@ApiResponseDoc({ status: 200, description: '2FA 验证成功，登录完成' })
@ApiResponseDoc({ status: 401, description: '无效的验证码或 pending token' })
async login2FA(
  @Body() dto: Login2FADto,
  @Req() request: Request,
  @Res({ passthrough: true }) response: Response,
): Promise<Omit<AuthResponse, 'accessToken' | 'refreshToken'>> {
  this.logger.log('🔐 2FA verification attempt');

  // 1. 从 Redis 获取 pending 登录信息
  const pendingData = await this.redisService.get(`2fa:pending:${dto.pendingToken}`);
  if (!pendingData) {
    throw new UnauthorizedException('Invalid or expired pending token');
  }

  const { userId, ipAddress, userAgent } = JSON.parse(pendingData);

  // 2. 验证 2FA 令牌
  const isValid = await this.twoFactorService.verify2FA(userId, dto.token);
  if (!isValid) {
    throw new UnauthorizedException('Invalid verification code');
  }

  // 3. 删除 pending token（一次性使用）
  await this.redisService.del(`2fa:pending:${dto.pendingToken}`);

  // 4. 获取用户信息
  const user = await this.usersService.findById(userId);
  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  // 5. 生成 Token
  const tokenContext = { userAgent, ipAddress };
  const tokens = await this.authService['tokenService'].generateTokens(user, tokenContext);

  // 6. 创建会话记录
  const expiresIn = this.authService['sessionService'].parseExpiration(
    process.env.JWT_REFRESH_EXPIRATION || '30d',
  );
  await this.authService['sessionService'].createSession(
    user.id,
    ipAddress,
    userAgent,
    user.tokenVersion,
    expiresIn,
  );

  // 7. 设置 Cookie
  this.setAuthCookies(response, tokens.accessToken, tokens.refreshToken);

  this.logger.log(`✅ 2FA verification successful for user: ${user.username}`);

  return {
    user,
  };
}

// 修改原有的 login 方法：
// 在 `const result = await this.authService.login(dto, ipAddress, userAgent);` 之前添加：

// 检查用户是否启用了 2FA
const userForCheck = await this.usersService.findByUsernameOrEmail(dto.usernameOrEmail);
if (userForCheck) {
  const is2FAEnabled = await this.twoFactorService.is2FAEnabled(userForCheck.id);

  if (is2FAEnabled) {
    // 验证密码（避免重复调用 authService.login）
    const bcrypt = require('bcrypt');
    const isPasswordValid = await bcrypt.compare(dto.password, userForCheck.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成 pending token
    const crypto = require('crypto');
    const pendingToken = crypto.randomBytes(32).toString('hex');

    // 存储 pending 登录信息到 Redis（5分钟有效期）
    await this.redisService.set(
      `2fa:pending:${pendingToken}`,
      JSON.stringify({ userId: userForCheck.id, ipAddress, userAgent }),
      300, // 5分钟 TTL
    );

    this.logger.log(`🔐 2FA required for user: ${userForCheck.username}`);

    // 返回 requiresTwoFactor 响应
    return {
      requiresTwoFactor: true,
      pendingToken,
      message: 'Two-factor authentication required',
    } as any;
  }
}
