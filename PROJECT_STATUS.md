# TRẠNG THÁI DỰ ÁN — HANOI PM2.5 WEBGIS (`PROJECT_STATUS.md`)

> [!IMPORTANT]
> **Dành cho AI trong các phiên làm việc tiếp theo:** Hãy luôn đọc file này đầu tiên cùng với `NEXT_STEPS.md` và `ARCHITECTURE_DECISIONS.md` trước khi thực hiện bất kỳ thao tác nào.

**Cập nhật lần cuối:** 2026-10-28 18:35 (GMT+7)  
**Giai đoạn vừa hoàn thành:**
- **GIAI ĐOẠN 0 — KIỂM TRA MÔI TRƯỜNG VÀ KHẢO SÁT DỮ LIỆU:** **Hoàn thành 100%**
- **GIAI ĐOẠN 1 — PHÂN TÍCH YÊU CẦU & THIẾT KẾ HỆ THỐNG:** **Hoàn thành 100%**
- **GIAI ĐOẠN 2 — THIẾT KẾ UI/UX (LẤY CẢM HỨNG TỪ WINDY.COM) & KHỞI TẠO MONOREPO / FRONTEND:** **Hoàn thành 100%**
**Giai đoạn tiếp theo:** **GIAI ĐOẠN 3 — BACKEND VÀ CƠ SỞ DỮ LIỆU KHÔNG GIAN SUPABASE POSTGIS** (Chờ người dùng xác nhận chuyển giai đoạn)

---

## 1. Kết quả Kiểm thử Giai đoạn 2

- **Kiểm tra kiểu tĩnh TypeScript (`npm run typecheck`):** Đạt 100% (`0 errors` trên cả `@hanoi-pm25/shared` và `@hanoi-pm25/web` với `strict: true`).
- **Kiểm thử đơn vị (`npm test` với Vitest):** Đạt **9/9 bài kiểm thử (`2 test files passed`)**:
  - `packages/shared/src/__tests__/aqi-and-qc.test.ts` (6/6 passed: phân loại ngưỡng QCVN 05:2023 & WHO, công thức `VN_AQI` Quyết định 1459/QĐ-TCMT, thuật toán `NowCast 12 giờ` quy tắc 2/3 giờ gần nhất, phân loại trạng thái `FRESH`/`STALE`/`UNAVAILABLE`, gán cờ `quality_flag` và khoảng cách cầu Haversine).
  - `apps/web/src/__tests__/snapshot-and-inspector.test.ts` (3/3 passed: kiểm chứng danh sách trạm thực tế tại Hà Nội, truy vấn vị trí bất kỳ tại Sóc Sơn kèm cảnh báo khoa học, và lưới mô hình CAMS Global `0.4° × 0.4°`).
- **Đóng gói Production (`npm run build` với Vite 6):** Thành công (`✓ 2262 modules transformed`, xuất `apps/web/dist/`).

---

## 2. Danh sách File đã tạo / sửa trong Giai đoạn 2

1. `docs/architecture/UI_UX_DESIGN_SPECIFICATION.md`
2. `package.json`, `package-lock.json`, `tsconfig.base.json`, `vitest.config.ts`
3. `packages/shared/package.json`, `packages/shared/tsconfig.json`
4. `packages/shared/src/types.ts`, `packages/shared/src/aqi.ts`, `packages/shared/src/index.ts`
5. `packages/shared/src/__tests__/aqi-and-qc.test.ts`
6. `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/tailwind.config.js`, `apps/web/postcss.config.js`, `apps/web/index.html`
7. `apps/web/src/index.css`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`
8. `apps/web/src/data/verifiedHanoiSnapshot.ts`, `apps/web/src/data/hanoiAdminBoundariesGeoJson.ts`
9. `apps/web/src/store/useWebGisStore.ts`
10. `apps/web/src/components/MapCanvas.tsx`
11. `apps/web/src/components/WindParticleOverlay.tsx`
12. `apps/web/src/components/FloatingHeader.tsx`
13. `apps/web/src/components/LayerSidebar.tsx`
14. `apps/web/src/components/StationPopupCard.tsx`
15. `apps/web/src/components/PointInspectorCard.tsx`
16. `apps/web/src/components/TimelineBar.tsx`
17. `apps/web/src/components/AnalyticsDrawer.tsx`
18. `apps/web/src/__tests__/snapshot-and-inspector.test.ts`
