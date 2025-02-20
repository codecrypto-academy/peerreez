import { useForm, FormProvider } from "react-hook-form";
import { Button } from "./ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ethers } from "ethers";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function Transfer() {
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userAccount, setUserAccount] = useState("");
  const form = useForm({
    mode: "onChange",
    defaultValues: {
      to: "",
      amount: 1,
    },
  });

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setUserAccount(accounts[0]);
      } catch (error) {
        console.error("Error al conectar la billetera:", error);
      }
    } else {
      alert("Por favor, instala MetaMask.");
    }
  };

  const onSubmit = async (data) => {
    try {
      if (!userAccount) {
        alert("Conecta tu billetera primero.");
        return;
      }
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const txResponse = await signer.sendTransaction({
        to: data.to,
        value: ethers.parseEther(data.amount.toString()),
      });
      const receipt = await txResponse.wait();
      setTx({ receipt, txResponse, data });
    } catch (error) {
      console.error("Error en la transacción:", error);
      setTx({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...form}>
      <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800">Transfer</h1>
        <p className="text-center text-gray-600">Transfer your money here</p>

        <Button onClick={connectWallet} className="w-full bg-blue-500 hover:bg-blue-600 transition">
          {userAccount ? `Conectado: ${userAccount.substring(0, 6)}...${userAccount.slice(-4)}` : "Conectar Billetera"}
        </Button>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            name="from"
            render={() => (
              <FormItem>
                <FormLabel className="text-gray-700">Cuenta de origen</FormLabel>
                <FormControl>
                  <Input placeholder="Conecta tu billetera" value={userAccount} disabled />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="to"
            rules={{ required: "La cuenta de destino es obligatoria" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Cuenta destino</FormLabel>
                <FormControl>
                  <Input placeholder="0xb85074929b563e1aDDeA7AE524547FB638cc8B19" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            rules={{
              required: "La cantidad es obligatoria",
              min: { value: 0.0001, message: "Debe ser mayor a 0" },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Cantidad</FormLabel>
                <FormControl>
                  <Input type="number" step="any" placeholder="8" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 transition" disabled={loading}>
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Enviar"}
          </Button>
        </form>

        {tx && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            {tx.error ? (
              <p className="text-red-500">Error: {tx.error}</p>
            ) : (
              <div>
                <p className="text-green-600">Transacción enviada</p>
                <p className="text-gray-800 break-all">Hash: {tx.receipt.hash}</p>
                <p className="text-gray-800 break-all">Block: {tx.receipt.blockNumber}</p>
                <p className="text-gray-800 break-all">Gas usado: {tx.receipt.gasUsed}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </FormProvider>
  );
}
