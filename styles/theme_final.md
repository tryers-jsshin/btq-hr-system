# Theme Specification (Linear Light — Unified & Mobile Optimized)

**Version:** 1.0.0-light  
**Source:** `linear-light-css-variables.css` + `linear-light-theme-json.json`  
**Theme Mode:** **Light Theme Only (다크 테마 미사용)**

---

## 0) Design Principles
- 깔끔하고 미니멀한 라이트 디자인
- 높은 대비와 가독성 유지
- 일관된 간격 시스템
- 부드러운 애니메이션
- 웹 접근성 준수
- 모바일 퍼스트 접근

> 이 문서는 **디자인 토큰(Design Tokens)**을 단일 참고서로 통합합니다. CSS 변수, Tailwind config, 컴포넌트 스타일 가이드를 이 문서 기준으로 일관 반영하세요.

---

## 1) Brand
- **Name**: Linear
- **Primary Font (stack)**: Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif

---

## 2) Colors

### 2.1 Background
| Token | Value |
|---|---|
| `--bg-primary` | `#ffffff` |
| `--bg-secondary` | `#fafbfb` |
| `--bg-card` | `#f7f8f9` |
| `--bg-surface` | `#f1f3f4` |

### 2.2 Text
| Token | Value |
|---|---|
| `--text-primary` | `#0a0b0c` |
| `--text-secondary` | `#4a5568` |
| `--text-muted` | `#718096` |

### 2.3 Brand
| Token | Value |
|---|---|
| `--brand-primary` | `#5e6ad2` |
| `--brand-secondary` | `#00b8cc` |
| `--brand-accent` | `#8b7cf6` |

### 2.4 Status
| Token | Value |
|---|---|
| `--status-success` | `#059669` |
| `--status-warning` | `#d97706` |
| `--status-error` | `#dc2626` |
| `--status-info` | `#2563eb` |

### 2.5 Gray Scale
50:#f9fafb, 100:#f3f4f6, 200:#e5e7eb, 300:#d1d5db, 400:#9ca3af, 500:#6b7280, 600:#4b5563, 700:#374151, 800:#1f2937, 900:#111827, 950:#030712

---

## 3) Typography

### 3.1 Family
- **Primary**: Pretendard
- **Fallbacks**: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif

### 3.2 Sizes
xs:10px, sm:13px, base:14px, md:15px, lg:16px, xl:17px, 2xl:21px, 3xl:24px, 4xl:40px, 5xl:56px, 6xl:64px

### 3.3 Weights
normal:400, medium:500, semibold:600, bold:700

### 3.4 Line Heights
tight:1.2, normal:1.5, relaxed:1.6

---

## 4) Spacing Scale
0:0px, 1:2px, 2:4px, 3:6px, 4:8px, 5:10px, 6:12px, 7:14px, 8:16px, 10:20px, 12:24px, 16:32px, 20:48px, 24:56px, 32:64px, 40:80px, 48:96px, 64:160px, 80:280px, px:1px

---

## 5) Radius
none:0px, sm:4px, base:6px, md:8px, lg:10px, xl:16px, 2xl:18px, 3xl:30px, full:9999px

---

## 6) Shadows
- sm: rgba(0, 0, 0, 0.05) 0px 1px 2px 0px
- base: rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px
- lg: rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px
- xl: rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.04) 0px 10px 10px -5px
- inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)
- outline: 0 0 0 3px rgba(94, 106, 210, 0.1)

---

## 7) Layout
- **Container Max Width**: 1024px
- **Content Max Width**: 768px
- **Text Max Width**: 65ch
- **Breakpoints**: sm 640px, md 768px, lg 1024px, xl 1280px, 2xl 1536px

---

## 8) Motion
- **Duration**: fast 0.1s, normal 0.16s, slow 0.2s, slower 0.25s, slowest 0.32s
- **Easing**: default cubic-bezier(0.25, 0.46, 0.45, 0.94), ease-out
- **Transitions**:  
  - colors: color var(--duration-fast) var(--easing-default), background var(--duration-fast) var(--easing-default)  
  - all: border var(--duration-normal) var(--easing-default), background-color var(--duration-normal) var(--easing-default), color var(--duration-normal) var(--easing-default), box-shadow var(--duration-normal) var(--easing-default), opacity var(--duration-normal) var(--easing-default), filter var(--duration-normal) var(--easing-default), transform var(--duration-normal) var(--easing-default)

---

## 9) Components (Presets)

### 9.1 Button
- **Primary**: bg `#5e6ad2`, text `#ffffff`, radius `6px`, padding `10px 16px`, font `14px/500`, shadow rgba(0,0,0,0.1) 0px 1px 3px  
- **Secondary**: bg `#f3f4f6`, text `#374151`, radius `6px`, border `1px solid #d1d5db`  
- **Ghost**: bg transparent, text `#6b7280`, radius `6px`

### 9.2 Card
- bg `#ffffff`, radius `8px`, padding `24px`, border `1px solid #f3f4f6`

### 9.3 Input
- bg `#ffffff`, text `#111827`, border `1px solid #d1d5db`, radius `6px`, padding `8px 12px`

---

## 10) CSS Variables (Canonical)
```css
:root {
  --font-primary:'Pretendard',-apple-system,system-ui,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;
  /* 나머지 CSS 변수는 기존 라이트 테마 토큰 값 동일 */
}
```

---

## 11) Tailwind Mapping
Tailwind `theme.extend`에 var 매핑하여 사용.

---

## 12) Usage Rules
- theme.md를 단일 소스로 사용  
- CSS 변수/컴포넌트 프리셋 기반 개발  
- 하드코딩 금지

---

## 13) Mobile Optimization (중요)

### 목표
- **모바일 퍼스트 디자인** (375~430px 기준)
- 데스크탑은 모바일 레이아웃 확장

### 가이드
1. **폰트**: base 15px, Pretendard
2. **간격 최소화**: 모바일에서는 space-0~8 우선
3. **폭 100% 컴포넌트**
4. **모바일 전용 네비게이션** (하단 탭, 햄버거 메뉴)
5. **이미지/아이콘 최적화** (2x/3x 레티나 대응)
6. **터치 영역 최소 44px**
7. **브레이크포인트**: sm 이하 = 모바일 전용
