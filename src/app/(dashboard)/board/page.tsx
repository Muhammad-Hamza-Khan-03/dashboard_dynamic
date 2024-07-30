import ChartModal from '@/components/board/Chart-Modal'
import DragChartModal from '@/components/Dragboard/D-ChartModal'

import S_ChartModal from '@/components/Sidebar/S-ChartModal'
import React from 'react'


const Board_Main = () => {
  return (
  <div className='flex bg-white rounded-lg mx-4 p-6 shadow-lg'>
      <div className='w-1/4 flex flex-col gap-y-4'>
          <ChartModal />
          <span className='block text-sm font-medium mt-1'>Simple Chart </span>
          <S_ChartModal />
          <span className='block text-sm font-medium mt-1'>Horizontal sidebar Chart</span>
          <DragChartModal />
          <span className='block text-sm font-medium mt-1'>Dragable Chart </span>
       </div>
      <div className='w-3/4 p-4'>
        <h2 className='text-xl font-semibold mb-4 text-center'>Select</h2>
        {/* Place the content of the selected modal here */}
      </div>
    </div>
      
  
  )
}

export default Board_Main
