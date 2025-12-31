function About() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">About</h1>
        <div className="prose max-w-none">
          <p className="text-lg text-gray-700 mb-4">
            This is a Vite project with React, React Router DOM, and Tailwind CSS.
          </p>
          <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-4">Technologies Used</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><strong>Vite</strong> - Next generation frontend tooling</li>
            <li><strong>React</strong> - JavaScript library for building user interfaces</li>
            <li><strong>React Router DOM</strong> - Declarative routing for React</li>
            <li><strong>Tailwind CSS</strong> - Utility-first CSS framework</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default About



