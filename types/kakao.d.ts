// Kakao Maps API 타입 정의

export interface Address {
  address_name: string;
  road_address_name?: string;
  x: string; // 경도
  y: string; // 위도
}

declare global {
  interface Window {
    kakao: any;
  }
}

export {};
