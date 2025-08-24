# React 코드 플레이그라운드

이 프로젝트는 **Vite**로 구축된 **React 기반 코드 플레이그라운드**로, 구문 강조, 실시간 트랜스파일, 라이브 미리보기와 같은 기능을 갖춘 실시간 코딩 환경을 제공하도록 설계되었습니다. JavaScript/TypeScript 및 JSX/React 코드 스니펫을 실험하기에 이상적입니다.

## 기능

### 1\. **Monaco 에디터 연동**

  - TypeScript 및 JavaScript 구문 강조 기능이 완벽하게 통합된 Monaco 에디터.
  - 향상된 코드 자동 완성 및 오류 검사를 위한 IntelliSense 지원.
  - 테마 및 빠른 제안을 포함한 사용자 정의 가능한 에디터 옵션.

### 2\. **실시간 코드 미리보기**

  - `esbuild-wasm`을 사용한 JavaScript/TypeScript 및 JSX 코드의 실시간 트랜스파일.
  - 트랜스파일 문제에 대한 오류 처리 및 미리보기 창에 오류 메시지 표시.
  - React 및 ReactDOM과 같은 외부 라이브러리를 동적으로 로드하기 위한 import maps 지원.

### 3\. **분할 레이아웃**

  - 왼쪽에는 에디터, 오른쪽에는 실시간 미리보기 창.
  - 현대적이고 깔끔한 UI를 위한 Tailwind CSS 기반의 반응형 디자인.

### 4\. **Vite 설정**

  - Vite를 사용하여 빠른 개발 속도에 최적화.
  - 스타일링을 위한 Tailwind CSS 통합.
  - 더 깔끔한 import를 위한 사용자 정의 별칭(alias) 설정 (예: `~`는 `src`에 매핑).

-----

## 프로젝트 구조

```
project-root/
├── src/
│   ├── components/
│   │   ├── Editor.tsx       # Monaco 에디터 연동
│   │   ├── Preview.tsx      # 실시간 코드 트랜스파일 및 미리보기
│   ├── utils/
│   │   ├── intelligenceManager.ts  # Monaco를 위한 IntelliSense 관리자
│   │   ├── bundler.ts       # 코드 번들링 유틸리티
│   │   ├── monacoInstance.ts # Monaco 인스턴스 관리
│   ├── App.tsx              # 메인 애플리케이션 레이아웃
│   ├── main.tsx             # 애플리케이션 진입점
├── public/                  # 정적 에셋
├── vite.config.ts           # Vite 설정 파일
├── tailwind.config.js       # Tailwind CSS 설정 파일
├── tsconfig.json            # TypeScript 설정 파일
└── README.md                # 프로젝트 문서
```

-----

## 시작하기

### 사전 요구사항

  - Node.js (v16 이상)
  - pnpm (권장) 또는 npm/yarn

### 설치

1.  저장소를 클론합니다:
    ```bash
    git clone <repository-url>
    cd react-code-playground
    ```
2.  의존성을 설치합니다:
    ```bash
    pnpm install
    ```

### 개발 서버 실행

개발 서버를 시작합니다:

```bash
pnpm dev
```

애플리케이션은 `http://localhost:5173`에서 사용할 수 있습니다.

### 프로덕션 빌드

프로덕션을 위해 프로젝트를 빌드합니다:

```bash
pnpm build
```

결과물은 `dist/` 디렉터리에 생성됩니다.

### 프로덕션 빌드 미리보기

프로덕션 빌드를 로컬에서 미리 봅니다:

```bash
pnpm preview
```

-----

## 사용법

1.  **코드 에디터**: 에디터에 JavaScript/TypeScript 또는 JSX 코드를 작성합니다.
2.  **라이브 미리보기**: 트랜스파일된 결과물을 미리보기 창에서 실시간으로 확인합니다.
3.  **오류 처리**: 트랜스파일 중 발생하는 오류는 미리보기 창에 표시됩니다.

-----

## 커스터마이징

### 에디터 옵션

`src/components/Editor.tsx`에서 Monaco 에디터 옵션을 사용자 정의할 수 있습니다. 예를 들어, IntelliSense를 활성화/비활성화하거나, 테마를 변경하거나, 빠른 제안을 수정할 수 있습니다.

### Import Maps

외부 라이브러리에 대한 import maps를 추가하거나 수정하려면 `src/components/Preview.tsx`의 `Preview` 컴포넌트를 업데이트하세요.