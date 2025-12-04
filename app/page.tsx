export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            자가운전대장
          </h1>
          <p className="text-gray-600">
            운행 기록 관리 시스템
          </p>
        </div>

        <div className="space-y-4">
          <a
            href="/login"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            로그인
          </a>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              운행 기록을 쉽고 빠르게 관리하세요
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
