import { useState, React } from 'react'
import { useNavigate } from 'react-router-dom';
import myopbg from '../src/assets/MyOperator Telephony.jpg'

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        try {
          console.log('Attempting login with:', email, password)
          const res = await fetch("http://localhost:5003/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
    
          if (!res.ok) throw new Error("Invalid credentials");
    
          const data = await res.json();
          console.log('Login successful, received token:', data.token ? 'yes' : 'no')
          localStorage.setItem("token", data.token); // Save JWT
          console.log('Navigating to dashboard...')
          navigate("/dashboard"); // Redirect
        } catch (err) {
          console.error('Login error:', err)
          setError(err.message);
        }
    };

  return (
    <div className="w-full h-screen flex flex-row items-center justify-around bg-[#f9fbfc]">
      <div className="w-4/6">
        <img src={myopbg} alt="logo" className="w-full h-full object-cover" />
      </div>
      <div className="w-2/6 h-full bg-white rounded-lg px-14 flex flex-col justify-center">
        <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold">Welcome to Telephony Testing Reports</h1>
            <p className="text-sm text-gray-500">Please sign-in to continue</p>
        </div>
        <div className="flex flex-col gap-2 mt-6">
            <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-500">Username</label>
            <input type="text" className="w-full px-2 py-3 rounded-sm border-1 border-gray-300 mb-2 hover:border-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2 relative">
                <label className="text-sm text-gray-500">Password</label>
                <input type="password" className="w-full px-2 py-3 rounded-sm border-1 border-gray-300 hover:border-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="cursor-pointer w-full mt-4 p-2 rounded-sm bg-[#8f3ad0] hover:bg-[#704d8d] transition-all duration-300 text-white shadow-lg shadow-[#bba5cc]">Login</button>
            {error && <p className="text-red-500">{error}</p>}
            </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
