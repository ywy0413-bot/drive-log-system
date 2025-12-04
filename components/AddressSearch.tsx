'use client';

import { useState, useEffect, useRef } from 'react';
import { Address } from '@/types';

interface AddressSearchProps {
  label: string;
  onAddressSelect: (address: Address) => void;
}

export default function AddressSearch({ label, onAddressSelect }: AddressSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Address[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = async (keyword: string) => {
    if (!keyword || keyword.trim().length < 2) {
      setResults([]);
      return;
    }

    // Kakao Maps API 로드 대기 (최대 1초)
    let retries = 0;
    while (retries < 10) {
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      console.error('Kakao Maps API가 로드되지 않았습니다.');
      return;
    }

    // 장소 검색 (업체명, 건물명, 랜드마크 등)
    const places = new window.kakao.maps.services.Places();

    places.keywordSearch(keyword, (result: any[], status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const addresses: Address[] = result.map((item) => ({
          address_name: item.address_name,
          road_address_name: item.road_address_name || item.address_name,
          x: item.x,
          y: item.y,
          place_name: item.place_name, // 장소명 추가
        }));
        setResults(addresses);
        setShowResults(true);
      } else {
        // 장소 검색 실패 시 주소 검색 시도
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(keyword, (result: any[], status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const addresses: Address[] = result.map((item) => ({
              address_name: item.address_name,
              road_address_name: item.road_address?.address_name,
              x: item.x,
              y: item.y,
            }));
            setResults(addresses);
            setShowResults(true);
          } else {
            setResults([]);
          }
        });
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    searchAddress(value);
  };

  const handleSelectAddress = (address: Address) => {
    setSelectedAddress(address);
    setQuery(address.road_address_name || address.address_name);
    setShowResults(false);
    onAddressSelect(address);
  };

  return (
    <div ref={searchRef} className="relative">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          if (results.length > 0) setShowResults(true);
        }}
        placeholder="업체명, 건물명 또는 주소를 입력하세요"
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-sm shadow-sm"
      />

      {showResults && results.length > 0 && (
        <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-auto">
          <div className="p-2">
            {results.map((address, index) => (
              <div
                key={index}
                onClick={() => handleSelectAddress(address)}
                className="px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer rounded-lg transition-all mb-1 last:mb-0 border border-transparent hover:border-blue-200"
              >
                {address.place_name && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-blue-500">📍</span>
                    <p className="text-sm font-bold text-blue-600">
                      {address.place_name}
                    </p>
                  </div>
                )}
                <p className="text-sm font-medium text-gray-800 ml-6">
                  {address.road_address_name || address.address_name}
                </p>
                {address.road_address_name && address.address_name !== address.road_address_name && (
                  <p className="text-xs text-gray-500 ml-6 mt-0.5">{address.address_name}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedAddress && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
            ✓ 선택됨
          </span>
          <span className="text-gray-600">
            {selectedAddress.place_name || selectedAddress.road_address_name || selectedAddress.address_name}
          </span>
        </div>
      )}
    </div>
  );
}
