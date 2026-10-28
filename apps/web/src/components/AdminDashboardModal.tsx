import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Database,
  Lock,
  Play,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useWebGisStore } from '../store/useWebGisStore.js';

type AdminTab = 'ingestion' | 'rules_alerts' | 'audit_logs';

export const AdminDashboardModal: React.FC = () => {
  const {
    isAdminModalOpen,
    closeAdminModal,
    userRole,
    setUserRole,
    authUserEmail,
    backendConnected,
    isRunningAdminAction,
    adminIngestionJobs,
    adminAuditLogs,
    adminAlertRules,
    alerts,
    refreshAdminOverview,
    triggerAdminLiveIngestion,
    acknowledgeOrResolveAlert,
    toggleOrUpdateAlertRule,
  } = useWebGisStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('ingestion');
  const [editingThresholds, setEditingThresholds] = useState<
    Record<string, number>
  >({});

  if (!isAdminModalOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100">
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Trung tâm Quản trị Hệ thống, Phân quyền RBAC & Nhật ký Kiểm toán
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {backendConnected ? 'PostGIS RBAC Live' : 'RBAC Local'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Quản lý tiến trình thu thập tự động (OpenAQ, WAQI, CAMS), cấu hình ngưỡng cảnh báo và truy vết nhật ký kiểm toán (`audit_logs`)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Role Switcher inside Modal */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setUserRole('GUEST')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  userRole === 'GUEST'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                GUEST
              </button>
              <button
                type="button"
                onClick={() => setUserRole('USER')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  userRole === 'USER'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                USER
              </button>
              <button
                type="button"
                onClick={() => setUserRole('ADMIN')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  userRole === 'ADMIN'
                    ? 'bg-purple-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ADMIN
              </button>
            </div>

            <button
              type="button"
              onClick={closeAdminModal}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300"
              aria-label="Đóng cửa sổ quản trị"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RBAC Access Guard when current role is not ADMIN */}
        {userRole !== 'ADMIN' ? (
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
            <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <Lock className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-rose-200">
                    HTTP 403 Forbidden — Yêu cầu quyền Quản trị viên (Role: ADMIN)
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Bạn đang truy cập với vai trò{' '}
                    <strong className="text-sky-300">{userRole}</strong>{' '}
                    {authUserEmail ? `(${authUserEmail})` : '(Khách vãng lai)'}.
                    Theo cơ chế phân quyền dựa trên vai trò (RBAC) tại middleware{' '}
                    <code className="text-rose-300">requireRole(&apos;ADMIN&apos;)</code>,
                    chỉ tài khoản Quản trị viên mới được phép kích hoạt thu thập dữ liệu,
                    thay đổi quy tắc cảnh báo hoặc xem nhật ký kiểm toán hệ thống.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserRole('ADMIN')}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-extrabold text-xs shadow-lg transition"
              >
                Đăng nhập ADMIN (admin@hanoi-pm25-gis.vn)
              </button>
            </div>

            {/* RBAC Permission Matrix Table */}
            <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Ma trận Phân quyền Hệ thống (RBAC Permission Matrix)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-3">Chức năng / API Endpoint</th>
                      <th className="py-2 px-3 text-center">GUEST (Khách)</th>
                      <th className="py-2 px-3 text-center">USER (Sinh viên / Người dân)</th>
                      <th className="py-2 px-3 text-center">ADMIN (Quản trị viên)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-slate-200">
                    <tr>
                      <td className="py-2.5 px-3">
                        Xem bản đồ WebGIS, trạm quan trắc, lưới CAMS 0.4°, truy vấn không gian PostGIS (`ST_Contains`, `ST_DWithin`)
                      </td>
                      <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                      <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                      <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3">
                        Lưu địa điểm yêu thích PostGIS & đặt ngưỡng cảnh báo PM2.5 cá nhân (`/api/v1/user/favorites`)
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500">✕ Chỉ lưu tạm trình duyệt</td>
                      <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ Đồng bộ PostGIS</td>
                      <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ Đồng bộ PostGIS</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3">
                        Kích hoạt thu thập dữ liệu tức thời & xem lịch sử worker (`/api/v1/admin/ingestion/*`)
                      </td>
                      <td className="py-2.5 px-3 text-center text-rose-400">✕ 401 Unauthorized</td>
                      <td className="py-2.5 px-3 text-center text-rose-400">✕ 403 Forbidden</td>
                      <td className="py-2.5 px-3 text-center text-purple-300 font-bold">✓ Toàn quyền</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3">
                        Cấu hình quy tắc cảnh báo, gắn cờ QC & truy vết nhật ký kiểm toán (`/api/v1/admin/audit-logs`)
                      </td>
                      <td className="py-2.5 px-3 text-center text-rose-400">✕ 401 Unauthorized</td>
                      <td className="py-2.5 px-3 text-center text-rose-400">✕ 403 Forbidden</td>
                      <td className="py-2.5 px-3 text-center text-purple-300 font-bold">✓ Toàn quyền</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Admin Sub-Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 bg-slate-900 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('ingestion')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'ingestion'
                      ? 'bg-purple-500 text-slate-950 shadow'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Tiến trình Thu thập (`ingestion_jobs` · {adminIngestionJobs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('rules_alerts')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'rules_alerts'
                      ? 'bg-purple-500 text-slate-950 shadow'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Quy tắc & Xử lý Cảnh báo ({adminAlertRules.length} quy tắc)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('audit_logs')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'audit_logs'
                      ? 'bg-purple-500 text-slate-950 shadow'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Nhật ký Kiểm toán (`audit_logs` · {adminAuditLogs.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  Phiên JWT: <strong className="text-purple-200">{authUserEmail ?? 'admin@hanoi-pm25-gis.vn'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => void refreshAdminOverview()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>

            {/* Tab Content Area */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* TAB 1: INGESTION JOBS */}
              {activeTab === 'ingestion' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span>Điều phối Thu thập Dữ liệu Thực tế Đa nguồn (Orchestrator)</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Kích hoạt đồng bộ trực tiếp từ OpenAQ v3, WAQI API, Open-Meteo CAMS 0.4° và Open-Meteo Weather vào Supabase PostGIS, tự động kiểm soát chất lượng (QC) và ghi vết vào `audit_logs`.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isRunningAdminAction}
                      onClick={() => void triggerAdminLiveIngestion()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {isRunningAdminAction
                          ? 'Đang thu thập & nạp PostGIS...'
                          : 'Thu thập Dữ liệu Thực tế Ngay'}
                      </span>
                    </button>
                  </div>

                  <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Lịch sử Thực thi Tiến trình Thu thập (`ingestion_jobs`)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Hiển thị {adminIngestionJobs.length} phiên gần nhất
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                            <th className="py-2.5 px-3">ID</th>
                            <th className="py-2.5 px-3">Nguồn dữ liệu</th>
                            <th className="py-2.5 px-3">Cơ chế kích hoạt</th>
                            <th className="py-2.5 px-3">Trạng thái</th>
                            <th className="py-2.5 px-3 text-right">Bản ghi thu thập</th>
                            <th className="py-2.5 px-3 text-right">Đã nạp DB</th>
                            <th className="py-2.5 px-3 text-right">Gắn cờ QC</th>
                            <th className="py-2.5 px-3 text-right">Thời gian chạy</th>
                            <th className="py-2.5 px-3">Thời điểm (GMT+7)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {adminIngestionJobs.map((job) => (
                            <tr key={job.id} className="hover:bg-slate-900/40">
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                                #{job.id}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-100">{job.sourceCode}</div>
                                <div className="text-[11px] text-slate-400">{job.sourceName}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px]">
                                  {job.triggerType}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    job.status === 'SUCCESS'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  }`}
                                >
                                  {job.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-slate-200">
                                {job.recordsFetched}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-emerald-300">
                                {job.recordsInserted}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-amber-300">
                                {job.recordsFlaggedQc}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                                {job.durationMs} ms
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">
                                {job.startedAtLocal}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ALERT RULES & ACTIVE ALERTS */}
              {activeTab === 'rules_alerts' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Left: Alert Rules Config */}
                  <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                        Quy tắc Cảnh báo Hệ thống (`alert_rules`)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Mọi thay đổi đều ghi vào `audit_logs`
                      </span>
                    </div>

                    <div className="space-y-3">
                      {adminAlertRules.map((rule) => {
                        const currentVal =
                          editingThresholds[rule.id] ?? rule.thresholdValue;
                        return (
                          <div
                            key={rule.id}
                            className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-bold text-white">
                                  {rule.nameVi}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  Mã: {rule.code} · Chỉ tiêu: {rule.metricName}{' '}
                                  {rule.comparisonOperator} {rule.thresholdValue}{' '}
                                  {rule.unit}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  void toggleOrUpdateAlertRule(rule.id, {
                                    isActive: !rule.isActive,
                                    reason: `${
                                      !rule.isActive ? 'Bật' : 'Tắt'
                                    } quy tắc ${rule.code}`,
                                  })
                                }
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                                  rule.isActive
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {rule.isActive ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                              </button>
                            </div>

                            <p className="text-[11px] text-slate-300">
                              {rule.descriptionVi}
                            </p>

                            <div className="flex items-center gap-2 pt-1">
                              <label className="text-[11px] text-slate-400">
                                Ngưỡng kích hoạt ({rule.unit}):
                              </label>
                              <input
                                type="number"
                                value={currentVal}
                                onChange={(e) =>
                                  setEditingThresholds({
                                    ...editingThresholds,
                                    [rule.id]: Number(e.target.value),
                                  })
                                }
                                className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-white"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void toggleOrUpdateAlertRule(rule.id, {
                                    thresholdValue: currentVal,
                                    reason: `Cập nhật ngưỡng ${rule.code} thành ${currentVal} ${rule.unit}`,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-[11px] font-bold text-purple-200 transition"
                              >
                                Lưu ngưỡng
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Alert Status Management */}
                  <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        Xác nhận & Xử lý Cảnh báo (`air_quality_alerts`)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {alerts.length} cảnh báo
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                      {alerts.map((al) => (
                        <div
                          key={al.id}
                          className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="text-xs font-bold text-white">
                                {al.titleVi}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                al.status === 'ACTIVE'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : al.status === 'ACKNOWLEDGED'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}
                            >
                              {al.status}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {al.messageVi}
                          </p>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-[10px] text-slate-400">
                              Khu vực: {al.areaNameVi} · Giá trị: {al.triggerValue}{' '}
                              {al.unit}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {al.status !== 'ACKNOWLEDGED' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void acknowledgeOrResolveAlert(
                                      al.id,
                                      'ACKNOWLEDGED',
                                      `Quản trị viên đã tiếp nhận cảnh báo tại ${al.areaNameVi}`
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-bold text-amber-200"
                                >
                                  Tiếp nhận (Ack)
                                </button>
                              )}
                              {al.status !== 'RESOLVED' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void acknowledgeOrResolveAlert(
                                      al.id,
                                      'RESOLVED',
                                      `Đã xử lý / đóng cảnh báo tại ${al.areaNameVi}`
                                    )
                                  }
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-bold text-emerald-200"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Đã xử lý</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AUDIT LOGS */}
              {activeTab === 'audit_logs' && (
                <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Nhật ký Kiểm toán Hệ thống Bất biến (`audit_logs`)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Truy vết người thực hiện, bảng tác động và trạng thái Trước / Sau (`JSONB`)
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                          <th className="py-2.5 px-3">Thời gian</th>
                          <th className="py-2.5 px-3">Người thực hiện</th>
                          <th className="py-2.5 px-3">Hành động (`action_type`)</th>
                          <th className="py-2.5 px-3">Đối tượng</th>
                          <th className="py-2.5 px-3">Thay đổi (old_values &rarr; new_values)</th>
                          <th className="py-2.5 px-3">Lý do kiểm toán</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {adminAuditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-900/40">
                            <td className="py-2.5 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                              {log.createdAtLocal}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-purple-200">
                                {log.actorEmail}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {log.actorName}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-[10px] font-bold">
                                {log.actionType}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                              {log.targetTable}:{log.targetId}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[10px] text-slate-300 max-w-xs truncate">
                              {log.oldValues
                                ? `${JSON.stringify(log.oldValues)} → `
                                : ''}
                              <span className="text-emerald-300">
                                {JSON.stringify(log.newValues)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">
                              {log.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
