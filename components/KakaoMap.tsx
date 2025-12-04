'use client';

import { useEffect, useRef } from 'react';
import { Address } from '@/types';

interface KakaoMapProps {
  departure: Address | null;
  destination: Address | null;
  waypoints: Address[];
  onDistanceCalculated: (distance: number) => void;
  setLoading: (loading: boolean) => void;
}

export default function KakaoMap({
  departure,
  destination,
  waypoints,
  onDistanceCalculated,
  setLoading,
}: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      if (!window.kakao || !window.kakao.maps) return;

      const container = mapRef.current;
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울 시청
        level: 8,
      };

      mapInstance.current = new window.kakao.maps.Map(container, options);
    };

    // Kakao Maps API가 로드될 때까지 대기
    if (window.kakao && window.kakao.maps) {
      initMap();
    } else {
      const checkInterval = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }
  }, []);

  // 경로 계산 및 표시
  useEffect(() => {
    if (!departure || !destination || !mapInstance.current) return;

    calculateAndDrawRoute();
  }, [departure, destination, waypoints]);

  const calculateAndDrawRoute = async () => {
    if (!departure || !destination) return;

    setLoading(true);

    try {
      // 기존 마커와 폴리라인 제거
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }

      // 경로 포인트 구성
      const points = [departure, ...waypoints, destination];

      // 마커 추가
      points.forEach((point, index) => {
        const position = new window.kakao.maps.LatLng(point.y, point.x);
        const marker = new window.kakao.maps.Marker({
          position: position,
          map: mapInstance.current,
        });

        // 마커에 라벨 추가
        const label = index === 0 ? '출발' : index === points.length - 1 ? '도착' : `경유${index}`;
        const iwContent = `<div style="padding:5px;font-size:12px;">${label}</div>`;
        const infowindow = new window.kakao.maps.InfoWindow({
          content: iwContent,
        });
        infowindow.open(mapInstance.current, marker);

        markersRef.current.push(marker);
      });

      // 경로 계산 (직선 거리의 합)
      let totalDistance = 0;
      const path = [];

      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        path.push(new window.kakao.maps.LatLng(point.y, point.x));

        if (i > 0) {
          const prevPoint = points[i - 1];
          const distance = getDistanceFromLatLon(
            parseFloat(prevPoint.y),
            parseFloat(prevPoint.x),
            parseFloat(point.y),
            parseFloat(point.x)
          );
          totalDistance += distance;
        }
      }

      // 폴리라인 그리기
      polylineRef.current = new window.kakao.maps.Polyline({
        path: path,
        strokeWeight: 5,
        strokeColor: '#FF0000',
        strokeOpacity: 0.7,
        strokeStyle: 'solid',
      });
      polylineRef.current.setMap(mapInstance.current);

      // 지도 범위 조정
      const bounds = new window.kakao.maps.LatLngBounds();
      path.forEach((point: any) => bounds.extend(point));
      mapInstance.current.setBounds(bounds);

      // 거리를 km 단위로 반환 (도로 거리 보정 계수 1.3 적용)
      const roadDistance = totalDistance * 1.3;
      onDistanceCalculated(parseFloat(roadDistance.toFixed(1)));

    } catch (error) {
      console.error('경로 계산 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 두 좌표 간 거리 계산 (Haversine formula)
  const getDistanceFromLatLon = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  return (
    <div className="w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" style={{ minHeight: '400px' }} />
    </div>
  );
}
