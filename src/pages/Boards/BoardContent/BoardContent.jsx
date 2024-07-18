import { useCallback, useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import ListColumns from './ListColumns/ListColumns'
import { mapOrder } from '~/utils/sorts'
import {
  DndContext,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  closestCorners,
  pointerWithin,
  getFirstCollision
} from '@dnd-kit/core'
import { MouseSensor, TouchSensor } from '~/customLibraries/DndKitSensors'
import { arrayMove } from '@dnd-kit/sortable'
import { cloneDeep, isEmpty } from 'lodash'
import { generatePlaceholderCard } from '~/utils/formatters'

import Column from './ListColumns/Column/Column'
import Card from './ListColumns/Column/ListCards/Card/Card'

const ACTIVE_DRAG_ITEM_TYPE = {
  COLUMN: 'ACTIVE_DRAG_ITEM_TYPE_COLUMN',
  CARD: 'ACTIVE_DRAG_ITEM_TYPE_CARD'
}

function BoardContent({ board }) {
  //Yêu cầu chuột di chuyển 10px thì mới kích hoạt event
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 10 } })
  //(Cho mobile)Yêu cầu nhấn giữ 250ms và khoảng cách của chuyển động lớn hơn 500px thì mới kích hoạt event
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 500 } })
  const sensors = useSensors(mouseSensor, touchSensor)

  const [orderedColumns, setOrderedColumns] = useState([])
  const [activeDragItemId, setActiveDragItemId] = useState(null)
  const [activeDragItemType, setActiveDragItemType] = useState(null)
  const [activeDragItemData, setActiveDragItemData] = useState(null)
  const [oldColumnWhenDraggingCard, setOldColumnWhenDraggingCard] = useState(null)

  //Điểm va chạm cuối cùng
  const lastOverId = useRef(null)

  useEffect(() => {
    setOrderedColumns(mapOrder(board?.columns, board?.columnOrderIds, '_id'))
  }, [board])

  const findColumnByCardId = (cardId) => {
    return orderedColumns.find(column => column?.cards?.map(card => card._id)?.includes(cardId))
  }
  //Cập nhật lại state khi di chuyển card giữa các column khác nhau
  const moveCardBetweenDifferentColumns = (
    overColumn,
    overCardId,
    active,
    over,
    activeColumn,
    activeDraggingCardId,
    activeDraggingCardData
  ) => {
    setOrderedColumns(prevColumns => {
      const overCardIndex = overColumn?.cards?.findIndex(card => card._id === overCardId)

      const isBelowOverItem = active.rect.current.translated &&
        active.rect.current.translated.top > over.rect.top + over.rect.height
      const modifier = isBelowOverItem ? 1 : 0
      let newCardIndex = overCardIndex >= 0 ? overCardIndex + modifier : overColumn?.cards?.length + 1
      //Clone mảng OrderedColumn cũ ra một cái mới để xử lý data rồi return để cập nhật OrderedColumn mới
      const nextColumns = cloneDeep(prevColumns)
      const nextActiveColumn = nextColumns.find(column => column._id === activeColumn._id)
      const nextOverColumn = nextColumns.find(column => column._id === overColumn._id)

      //Column cũ
      if (nextActiveColumn) {
        //Xóa card ở column active
        nextActiveColumn.cards = nextActiveColumn.cards.filter(card => card._id !== activeDraggingCardId)

        //Thêm FE_PlaceholderCard nếu Column rỗng (bị kéo hết card đi)
        if (isEmpty(nextActiveColumn.cards)) {
          nextActiveColumn.cards = [generatePlaceholderCard(nextActiveColumn)]
        }

        nextActiveColumn.cardOrderIds = nextActiveColumn.cards.map(card => card._id)
      }
      //Column mới
      if (nextOverColumn) {
        //Kiểm tra xem card đang kéo có tồn tại ở overColumn hay chưa, nếu có thì xóa nó trước
        nextOverColumn.cards = nextOverColumn.cards.filter(card => card._id !== activeDraggingCardId)
        //cập nhật lại columnId trong card sau khi kéo sang column khác
        const rebuild_activeDraggingCardData = {
          ...activeDraggingCardData,
          columnId: nextOverColumn._id
        }
        //Thêm card đang kéo vào overColumn theo vị trí index mới
        nextOverColumn.cards = nextOverColumn.cards.toSpliced(newCardIndex, 0, rebuild_activeDraggingCardData)

        //Xóa cái Placeholder card đi nếu nó đang tồn tại
        nextOverColumn.cards = nextOverColumn.cards.filter(card => !card.FE_PlaceholderCard)

        nextOverColumn.cardOrderIds = nextOverColumn.cards.map(card => card._id)
      }

      return nextColumns
    })
  }
  const handleDragStart = (event) => {
    setActiveDragItemId(event?.active?.id)
    setActiveDragItemType(event?.active?.data?.current?.columnId ? ACTIVE_DRAG_ITEM_TYPE.CARD : ACTIVE_DRAG_ITEM_TYPE.COLUMN)
    setActiveDragItemData(event?.active?.data?.current)
    //Nếu là kéo card thì mới set giá trị oldColumn để có state cho handleDragEnd sử dụng
    if (event?.active?.data?.current?.columnId) {
      setOldColumnWhenDraggingCard(findColumnByCardId(event?.active?.id))
    }
  }
  //trigger trong quá trình drag một phần tử
  const handleDragOver = (event) => {
    //không làm gì thêm nếu đang kéo column
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) return
    //Xử lý tiếp nếu đang kéo card
    const { active, over } = event
    if (!active || !over) return
    const { id: activeDraggingCardId, data: { current: activeDraggingCardData } } = active
    const { id: overCardId } = over

    //Tìm 2 cái column theo cardId
    const activeColumn = findColumnByCardId(activeDraggingCardId)
    const overColumn = findColumnByCardId(overCardId)

    if (!activeColumn || !overColumn) return
    if (activeColumn._id !== overColumn._id) {
      moveCardBetweenDifferentColumns(
        overColumn,
        overCardId,
        active,
        over,
        activeColumn,
        activeDraggingCardId,
        activeDraggingCardData
      )
    }
  }
  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!active || !over) return

    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) {
      const { id: activeDraggingCardId, data: { current: activeDraggingCardData } } = active
      const { id: overCardId } = over

      //Tìm 2 cái column theo cardId
      const activeColumn = findColumnByCardId(activeDraggingCardId)
      const overColumn = findColumnByCardId(overCardId)

      if (!activeColumn || !overColumn) return

      if (oldColumnWhenDraggingCard._id !== overColumn._id) {
        //Kéo thả khác column
        moveCardBetweenDifferentColumns(
          overColumn,
          overCardId,
          active,
          over,
          activeColumn,
          activeDraggingCardId,
          activeDraggingCardData
        )
      } else {
        //Kéo thả cùng column
        const oldCardIndex = oldColumnWhenDraggingCard?.cards?.findIndex(c => c._id === activeDragItemId)
        const newCardIndex = overColumn?.cards?.findIndex(c => c._id === overCardId)

        const dndOrderedCards = arrayMove(oldColumnWhenDraggingCard?.cards, oldCardIndex, newCardIndex)
        setOrderedColumns(prevColumns => {
          //Clone mảng OrderedColumn cũ ra một cái mới để xử lý data rồi return để cập nhật OrderedColumn mới
          const nextColumns = cloneDeep(prevColumns)
          //Tìm tới column đang thả
          const targetColumn = nextColumns.find(column => column._id === overColumn._id)
          targetColumn.cards = dndOrderedCards
          targetColumn.cardOrderIds = dndOrderedCards.map(card => card._id)
          return nextColumns
        })
      }
    }
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) {
      if (active?.id !== over?.id) {
        const oldColumnIndex = orderedColumns.findIndex(c => c._id === active?.id)
        const newColumnIndex = orderedColumns.findIndex(c => c._id === over?.id)

        const dndOrderedColumns = arrayMove(orderedColumns, oldColumnIndex, newColumnIndex)
        // const dndOrderedColumnsIds = dndOrderedColumns.map(c => c._id)

        setOrderedColumns(dndOrderedColumns)
      }
    }

    setActiveDragItemId(null)
    setActiveDragItemType(null)
    setActiveDragItemData(null)
    setOldColumnWhenDraggingCard(null)
  }
  const dropAnimation = { sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }
  const collisionDetectionStrategy = useCallback((args) => {
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) {
      return closestCorners({ ...args })
    }
    //Tìm các điểm giao nhau, va chạm - intersections với con trỏ, trả về mảng va chạm
    const pointerIntersections = pointerWithin(args)
    if (!pointerIntersections?.length) return //card bị kéo ra khỏi khu vực kéo thả
    //Thuật toán phát hiện va chạm sẽ trả về mảng va chạm
    // const intersections = !!pointerIntersections?.length
    //   ? pointerIntersections
    //   : rectIntersection(args)
    //Tìm overId đầu tiên trong pointerIntersections
    let overId = getFirstCollision(pointerIntersections, 'id')
    if (overId) {
      const checkColumn = orderedColumns.find(column => column._id === overId)
      if (checkColumn) {
        overId = closestCorners({
          ...args,
          droppableContainers: args.droppableContainers.filter(container => {
            return (container.id !== overId) && (checkColumn?.cardOrderIds?.includes(container.id))
          })
        })[0]?.id
      }
      lastOverId.current = overId
      return [{ id: overId }]
    }
    return lastOverId.current ? [{ id: lastOverId.current }] : []
  }, [activeDragItemType, orderedColumns])
  return (
    <DndContext
      sensors={sensors}
      // collisionDetection={closestCorners}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{
        backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#34495e' : '#1976d2'),
        width:'100%',
        height: (theme) => theme.webCustom.boardContentHeight,
        p:'10px 0'
      }}>
        <ListColumns columns={orderedColumns}/>
        <DragOverlay dropAnimation={dropAnimation}>
          {!activeDragItemType && null}
          {(activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) && <Column column={activeDragItemData}/>}
          {(activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) && <Card card={activeDragItemData}/>}
        </DragOverlay>
      </Box>
    </DndContext>
  )
}

export default BoardContent