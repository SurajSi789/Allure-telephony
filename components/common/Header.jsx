import React from 'react'

const Header = () => {
  return (
    <div className='w-full fixed top-0 bg-[#134e6c] border-b-1'>
      <div className='p-4 flex justify-between items-center'>
        <h1 className='text-2xl font-bold text-white'>Telephony Test Report</h1>
        <div className='flex items-center space-x-4'>
          <span className='text-[#c6cbcd]'>Welcome back!</span>
          <div className='w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center'>
            <span className='text-white text-sm font-bold'>T</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header
