import ChartModal from '@/components/board/Chart-Modal'
import DragChartModal from '@/components/Dragboard/D-ChartModal'
import S_ChartModal from '@/components/Sidebar/S-ChartModal'
import React from 'react'

const Board_Main = () => {
  return (
    
    <div className='gap-y-4'>
      <div className=' bg-white rounded-lg mx-4 p-4'>
        <ChartModal />
        <S_ChartModal />
        <DragChartModal />
      </div>
    </div>
  )
}

export default Board_Main
