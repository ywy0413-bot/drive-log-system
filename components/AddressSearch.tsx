'use client';

import { useState, useEffect, useRef } from 'react';
import { Address } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface AddressSearchProps {
  label: string;
  onAddressSelect: (address: Address) => void;
}

interface FavoritePlace {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
}

export default function AddressSearch({ label, onAddressSelect }: AddressSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Address[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [noResults, setNoResults] = useState(false);
  const [favorites, setFavorites] = useState<FavoritePlace[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLDivElement>(null);
  const user = getCurrentUser();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  async function loadFavorites() {
    if (!user) return;

    const { data, error } = await supabase
      .from('favorite_places')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFavorites(data);
      const ids = new Set(data.map(f => `${f.place_name}-${f.address_name}`));
      setFavoriteIds(ids);
    }
  }

  async function toggleFavorite(address: Address, isFavorite: boolean) {
    if (!user) return;

    const favoriteKey = `${address.place_name || ''}-${address.address_name}`;

    if (isFavorite) {
      // 즐겨찾기에서 제거
      const favorite = favorites.find(f => `${f.place_name}-${f.address_name}` === favoriteKey);
      if (favorite) {
        await supabase.from('favorite_places').delete().eq('id', favorite.id);
        setFavorites(favorites.filter(f => f.id !== favorite.id));
        const newIds = new Set(favoriteIds);
        newIds.delete(favoriteKey);
        setFavoriteIds(newIds);
      }
    } else {
      // 즐겨찾기에 추가
      const { data, error } = await supabase
        .from('favorite_places')
        .insert({
          user_id: user.id,
          place_name: address.place_name || '',
          address_name: address.address_name,
          road_address_name: address.road_address_name || address.address_name,
          x: address.x,
          y: address.y,
        })
        .select()
        .single();

      if (!error && data) {
        setFavorites([data, ...favorites]);
        const newIds = new Set(favoriteIds);
        newIds.add(favoriteKey);
        setFavoriteIds(newIds);
      }
    }
  }

  function isFavorite(address: Address): boolean {
    const favoriteKey = `${address.place_name || ''}-${address.address_name}`;
    return favoriteIds.has(favoriteKey);
  }

  const searchAddress = async (keyword: string) => {
    if (!keyword || keyword.trim().length < 2) {
      setResults([]);
      setNoResults(false);
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

    // 1차: 장소 검색 (업체명, 건물명, 랜드마크 등 - 한글/영문 모두 지원)
    const places = new window.kakao.maps.services.Places();

    places.keywordSearch(keyword, (result: any[], status: any) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        console.log('✅ 장소 검색 성공:', result.length, '개 결과');
        const addresses: Address[] = result.map((item) => ({
          address_name: item.address_name,
          road_address_name: item.road_address_name || item.address_name,
          x: item.x,
          y: item.y,
          place_name: item.place_name, // 장소명 추가
        }));
        setResults(addresses);
        setShowResults(true);
        setNoResults(false);
      } else {
        console.log('ℹ️ 장소 검색 결과 없음, 주소 검색 시도...');
        // 2차: 주소 검색 시도
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(keyword, (result: any[], status: any) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            console.log('✅ 주소 검색 성공:', result.length, '개 결과');
            const addresses: Address[] = result.map((item) => ({
              address_name: item.address_name,
              road_address_name: item.road_address?.address_name,
              x: item.x,
              y: item.y,
            }));
            setResults(addresses);
            setShowResults(true);
            setNoResults(false);
          } else {
            console.log('❌ 검색 결과 없음:', keyword);
            setResults([]);
            setShowResults(true);
            setNoResults(true);
          }
        });
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim().length >= 2) {
      searchAddress(value);
    } else {
      setResults([]);
      setNoResults(false);
    }
  };

  const handleSelectAddress = (address: Address) => {
    setSelectedAddress(address);
    setQuery(address.road_address_name || address.address_name);
    setShowResults(false);
    onAddressSelect(address);
  };

  const handleFavoriteClick = (e: React.MouseEvent, address: Address) => {
    e.stopPropagation();
    toggleFavorite(address, isFavorite(address));
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
          if (results.length > 0 || favorites.length > 0) setShowResults(true);
        }}
        placeholder="업체명, 건물명 또는 주소를 입력하세요"
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-sm shadow-sm"
      />

      {showResults && (favorites.length > 0 || results.length > 0) && (
        <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-auto">
          <div className="p-2">
            {/* 즐겨찾기 목록 */}
            {favorites.length > 0 && query.trim().length < 2 && (
              <div className="mb-2">
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 flex items-center gap-1">
                  ⭐ 자주 가는 장소
                </div>
                {favorites.map((fav) => {
                  const favAddress: Address = {
                    place_name: fav.place_name,
                    address_name: fav.address_name,
                    road_address_name: fav.road_address_name,
                    x: fav.x,
                    y: fav.y,
                  };
                  return (
                    <div
                      key={fav.id}
                      onClick={() => handleSelectAddress(favAddress)}
                      className="px-4 py-3 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-amber-50 cursor-pointer rounded-lg transition-all mb-1 border border-transparent hover:border-yellow-200 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {fav.place_name && (
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-yellow-500">⭐</span>
                              <p className="text-sm font-bold text-gray-800">
                                {fav.place_name}
                              </p>
                            </div>
                          )}
                          <p className="text-sm font-medium text-gray-700 ml-6">
                            {fav.road_address_name || fav.address_name}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleFavoriteClick(e, favAddress)}
                          className="ml-2 p-1.5 hover:bg-yellow-100 rounded-full transition-colors"
                          title="즐겨찾기 제거"
                        >
                          <span className="text-lg">⭐</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
                {results.length > 0 && (
                  <div className="border-t border-gray-200 my-2"></div>
                )}
              </div>
            )}

            {/* 검색 결과 */}
            {results.map((address, index) => {
              const isAddressFavorite = isFavorite(address);
              return (
                <div
                  key={index}
                  onClick={() => handleSelectAddress(address)}
                  className="px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer rounded-lg transition-all mb-1 last:mb-0 border border-transparent hover:border-blue-200 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
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
                    <button
                      onClick={(e) => handleFavoriteClick(e, address)}
                      className="ml-2 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                      title={isAddressFavorite ? "즐겨찾기 제거" : "즐겨찾기 추가"}
                    >
                      <span className="text-lg">{isAddressFavorite ? '⭐' : '☆'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showResults && noResults && query.length >= 2 && (
        <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
          <div className="text-center text-gray-500">
            <p className="text-sm font-medium mb-2">🔍 검색 결과가 없습니다</p>
            <p className="text-xs text-gray-400 mb-3">"{query}"에 대한 결과를 찾을 수 없습니다</p>
            <div className="text-left bg-blue-50 rounded-lg p-3 text-xs">
              <p className="font-semibold text-blue-700 mb-1">💡 검색 팁:</p>
              <ul className="space-y-1 text-gray-600">
                <li>• 회사명 전체 입력: "㈜기가비스", "기가비스코리아"</li>
                <li>• 영문명 시도: "GIGAVIS"</li>
                <li>• 주소 직접 입력: "서울시 강남구..."</li>
                <li>• 주변 건물명이나 랜드마크 검색</li>
              </ul>
            </div>
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
