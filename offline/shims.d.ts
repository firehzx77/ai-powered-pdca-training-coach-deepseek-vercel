// Minimal shims so TypeScript can transpile without installing @types/*.
// This is ONLY used to generate the offline preview JS (no bundler).

// --- React ---
declare module 'react' {
  const React: any;
  export default React;

  // Provide generic signatures so type args like useState<...>() don't error.
  export function useState<T = any>(initial?: T | (() => T)): any;
  export function useEffect(effect: any, deps?: any): any;
  export function useMemo<T = any>(factory: () => T, deps?: any): any;
  export function useRef<T = any>(initial?: T): any;

  export const StrictMode: any;
}

declare module 'react-dom/client' {
  export function createRoot(el: any): { render: (v: any) => void };
}

declare module 'react/jsx-runtime' {
  export const Fragment: any;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
}

// --- lucide-react icons used in App.tsx ---
declare module 'lucide-react' {
  export const ChevronRight: any;
  export const Home: any;
  export const Target: any;
  export const Search: any;
  export const Layout: any;
  export const Download: any;
  export const MessageSquare: any;
  export const Bot: any;
  export const User: any;
  export const ChevronLeft: any;
  export const FileText: any;
  export const RefreshCw: any;
  export const Trophy: any;
  export const AlertCircle: any;
  export const Settings2: any;
  export const CheckCircle2: any;
  export const Info: any;
}

// JSX namespace so TS can compile JSX without DOM typings packages.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
