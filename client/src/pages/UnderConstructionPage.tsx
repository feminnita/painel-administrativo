import { useLocation } from "react-router-dom";

export function UnderConstructionPage() {
  const { pathname } = useLocation();
  return (
    <div className="flex h-full flex-col items-center justify-center p-16 text-center">
      <h1 className="text-2xl font-semibold text-gray-700">🚧 Em construção</h1>
      <p className="mt-2 text-gray-500">
        A tela <code className="rounded bg-gray-200 px-2 py-0.5">{pathname}</code> ainda não foi portada.
      </p>
    </div>
  );
}
