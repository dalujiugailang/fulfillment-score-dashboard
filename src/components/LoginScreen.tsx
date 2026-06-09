/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Lock, User, AlertTriangle, KeyRound, Eye, EyeOff } from 'lucide-react';

export type UserRoleType = 'admin' | 'qingyang' | 'haijing' | 'xiaozhi';

export interface UserSession {
  role: UserRoleType;
  userName: string;
  email: string;
  avatarColor: string;
}

interface LoginScreenProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error('登录失败：账号或密码不匹配，请核对线下分发的账号信息后重试。');
      }

      const data = await response.json();
      localStorage.setItem('cp_auth_token', data.token);
      onLoginSuccess(data.session);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '登录失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="command-center min-h-screen bg-[#fcfaf7] grid lg:grid-cols-[0.9fr_1.1fr] relative overflow-hidden select-none">
      <section className="cc-shell hidden lg:flex flex-col justify-between p-10">
        <div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-[#c2410c] flex items-center justify-center text-white shadow-xl shadow-black/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-white tracking-[0.18em]">GTM OPS</p>
              <p className="text-xs text-white/55 font-semibold tracking-[0.24em]">FULFILLMENT COMMAND</p>
            </div>
          </div>
          <div className="mt-16 max-w-md">
            <p className="text-xs text-[#fe6e00] font-black tracking-[0.2em]">OPERATIONS CONSOLE</p>
            <h1 className="text-4xl font-black text-white mt-4 leading-tight">大家电履约评分控制台</h1>
            <p className="text-sm text-white/55 mt-4 leading-6">
              管理履约评分、匿名排名、源数据发布和服务商访问权限。
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-[11px]">
          {['周期评分', '源数据发布', '版本历史'].map(item => (
            <div key={item} className="rounded-md border border-white/10 bg-white/8 px-3 py-3 font-bold text-white/70">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col justify-center py-12 sm:px-6 lg:px-16">
        <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 lg:hidden">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-md bg-[#c2410c] flex items-center justify-center text-white shadow-xl shadow-black/10">
              <Shield className="w-6 h-6" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-2xl font-extrabold text-[#171412] tracking-tight">
            大家电履约评分控制台
          </h2>
          <p className="mt-2 text-center text-xs text-[#797067] font-medium">
            2026 考核周期一 · 数据上传、评分追踪与版本追溯
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-[#f3f4f6] py-8 px-6 sm:px-10 border border-[#e3e0dd] rounded-md shadow-xl space-y-6">
          <div>
            <p className="cc-kicker">SECURE LOGIN</p>
            <h2 className="text-2xl font-black text-[#171412] mt-2">登录控制台</h2>
          </div>
          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            {/* Username Input */}
            <div className="space-y-1">
              <label htmlFor="account-user" className="text-[11px] font-bold text-[#797067] block">
                用户账号 (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#797067]">
                  <User className="w-4.5 h-4.5" />
                </div>
                <input
                  id="account-user"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入登录账号"
                  className="block w-full text-xs pl-10 pr-3.5 py-2.5 border border-[#d1d5dc] rounded-md outline-none hover:border-[#797067] focus:border-[#fe6e00] bg-white text-[#423d38] transition-colors"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label htmlFor="account-pass" className="text-[11px] font-bold text-[#797067] block">
                登录密码 (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#797067]">
                  <KeyRound className="w-4.5 h-4.5" />
                </div>
                <input
                  id="account-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="block w-full text-xs pl-10 pr-10 py-2.5 border border-[#d1d5dc] rounded-md outline-none hover:border-[#797067] focus:border-[#fe6e00] bg-white text-[#423d38] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#797067] hover:text-[#423d38] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Error notifications */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg text-rose-700 text-[11px] leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full text-xs cc-primary-button disabled:opacity-60 font-bold py-2.5 rounded-md shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-98"
              >
                <Lock className="w-4 h-4" />
                {loading ? '身份校验中...' : '核准进入看板控制台'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </section>
    </div>
  );
};
