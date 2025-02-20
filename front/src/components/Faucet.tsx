import { useContext, useState } from "react";
import { UserContext } from "@/App";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

export function Faucet() {
  const { state } = useContext(UserContext);
  const [tx, setTx] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true); // Activar el spinner
    try {
      const result = await fetch(`http://localhost:3333/api/faucet/${state.acc}/1`);
      const data = await result.json();
      setTx(data);
      console.log(data);
    } catch (error) {
      console.error("Error al solicitar fondos:", error);
    } finally {
      setLoading(false); // Desactivar el spinner
    }
  }

  return (
    <div className="flex flex-col items-center p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Faucet</h1>
      <div className="text-lg text-gray-700 bg-gray-100 px-6 py-3 rounded-lg shadow-md">
        <p>
          <span className="font-semibold">Address:</span> {state.acc}
        </p>
        <Button onClick={handleClick} disabled={loading} className="mt-4 flex items-center gap-2">
          {loading && <Loader2 className="animate-spin w-5 h-5" />}
          {loading ? "Procesando..." : "Solicitar Fondos"}
        </Button>
      </div>
    </div>
  );
}
