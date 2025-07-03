/// <reference types="next" />
/// <reference types="next/image-types/global" />

// CSS Module type declarations
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}