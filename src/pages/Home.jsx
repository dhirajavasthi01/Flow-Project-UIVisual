function Home() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Flow Project UI</h1>
        <p className="text-xl text-gray-600 mb-6">
          Built with Vite, React, React Router, and Tailwind CSS
        </p>
        <div className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">⚡ Vite</h3>
              <p className="text-gray-600">Fast build tool and dev server</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">⚛️ React</h3>
              <p className="text-gray-600">Modern UI library</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">🎨 Tailwind</h3>
              <p className="text-gray-600">Utility-first CSS framework</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home



