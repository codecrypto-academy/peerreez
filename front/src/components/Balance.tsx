import { UserContext } from "@/App";
import { useContext, useEffect, useState } from "react";

export function Balance() {
  const { state, setState } = useContext(UserContext);
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (ethereum == null) {
      alert("Please install MetaMask");
      return;
    }
    ethereum.request({ method: 'eth_getBalance', params: [state.acc] })
      .then((balance: number) => {
        setBalance(balance);
      });
  }, [state.acc]);

  return (
    <div className="flex flex-col items-center p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Balance</h1>
      <p className="text-lg text-gray-700 bg-gray-100 px-6 py-3 rounded-lg shadow-md">
        <span className="font-semibold">Address:</span> {state.acc} <br />
        <span className="font-semibold">Balance:</span> {Number(balance) / 10 ** 18}
      </p>
    </div>
  );
  
}