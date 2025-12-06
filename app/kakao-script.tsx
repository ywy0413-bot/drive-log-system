'use client';

import { useEffect } from 'react';

export default function KakaoScript() {
  useEffect(() => {
    // 이미 로드되어 있으면 스킵
    if (window.kakao && window.kakao.maps) {
      return;
    }

    const appKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY;

    console.log('🔍 Kakao API Key 확인:', appKey ? `${appKey.substring(0, 8)}...` : 'undefined');

    if (!appKey) {
      console.error('❌ NEXT_PUBLIC_KAKAO_APP_KEY 환경변수가 없습니다!');
      return;
    }

    // 스크립트 동적 로드
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.async = true;

    console.log('📡 Kakao Maps SDK 로딩 시작:', script.src);

    script.onload = () => {
      // autoload=false이므로 수동으로 로드
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          console.log('✅ Kakao Maps SDK 로드 완료');
        });
      }
    };

    script.onerror = () => {
      console.error('❌ Kakao Maps SDK 로드 실패');
    };

    document.head.appendChild(script);

    return () => {
      // cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return null;
}
