import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useContext, useEffect } from 'react';
import { UserContext } from '@/App';

export function Header() {
  const { state, setState } = useContext(UserContext);

  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (ethereum == null) {
      alert("Please install MetaMask");
      return;
    }

    const handleAccountsChanged = (accounts: string[]) => {
      setState({ acc: accounts[0] });
    };

    ethereum.request({ method: 'eth_requestAccounts' })
      .then((acc: string[]) => {
        setState({ acc: acc[0] });
        ethereum.on('accountsChanged', handleAccountsChanged);
      });

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [setState]);

  return (
    <div className="flex flex-col items-center pt-6 space-y-4">
      {/* Navegación */}
      <nav className="flex space-x-4">
        <Link to="/home">
          <Button className="px-6 py-2">Home</Button>
        </Link>
        <Link to="/faucet">
          <Button className="px-6 py-2">Faucet</Button>
        </Link>
        <Link to="/balance">
          <Button className="px-6 py-2">Balance</Button>
        </Link>
        <Link to="/transfer">
          <Button className="px-6 py-2">Transfer</Button>
        </Link>
      </nav>
  
      {/* Estado de la cuenta */}
      <div className="flex justify-center">
        {state.acc ? (
          <p className="text-lg font-bold text-center border-2 border-gray-400 px-6 py-3 rounded-lg shadow-md bg-gray-100">
            {state.acc}
          </p>
        ) : (
          <p className="text-gray-500 text-lg italic">Cuenta no seleccionada</p>
        )}
      </div>
    </div>
  );
}