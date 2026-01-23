import React from 'react';

interface Props {
  data: Record<string, any>;
}

export const SceneGraph: React.FC<Props> = ({ data }) => {
  return (
    <div className="flex flex-col h-2/3 bg-gray-900 text-white font-mono border-l border-gray-700">
      <div className="bg-gray-800 text-gray-300 px-4 py-2 text-sm border-b border-gray-700 font-bold">
        Scene Graph (Memory)
      </div>
      <div className="flex-1 overflow-auto p-4">
        {Object.keys(data).length === 0 ? (
          <div className="text-gray-500 italic text-sm">Empty Scene</div>
        ) : (
          <pre className="text-xs text-green-300">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};