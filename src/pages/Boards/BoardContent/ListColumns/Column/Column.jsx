import { useState } from 'react'
import { toast } from 'react-toastify'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import ContentCut from '@mui/icons-material/ContentCut'
import Cloud from '@mui/icons-material/Cloud'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import AddCardIcon from '@mui/icons-material/AddCard'
import ContentCopy from '@mui/icons-material/ContentCopy'
import ContentPaste from '@mui/icons-material/ContentPaste'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import CloseIcon from '@mui/icons-material/Close'
import ListCards from './ListCards/ListCards'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useConfirm } from 'material-ui-confirm'

function Column({ column, createNewCard, deleteColumnDetails }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column._id,
    data: { ...column }
  })
  const dndKitColumnStyles = {
    touchAction: 'none',
    transform: CSS.Translate.toString(transform),
    transition,
    height:'100%',
    opacity: isDragging ? 0.5 : undefined
  }

  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }
  const orderedCards = column.cards
  const [openNewCardForm, setOpenNewCardForm] = useState(false)
  const toggleOpenNewCardForm = () => setOpenNewCardForm(!openNewCardForm)
  const [newCardTitle, setNewCardTitle] = useState('')
  const addNewCard = () => {
    if (!newCardTitle) {
      toast.error('Please enter Card title!', { position: 'bottom-right' })
      return
    }
    const newCardData = {
      title: newCardTitle,
      columnId: column._id
    }

    createNewCard(newCardData)
    toggleOpenNewCardForm()
    setNewCardTitle('')
  }
  const confirmDeleteColumn = useConfirm()
  const handleDeleteColumn = () => {
    confirmDeleteColumn({
      title: 'Delete Column?',
      description: `The column name "${column.title}" must be entered for deletion to be confirmed!`,
      confirmationText: 'Confirm',
      cancellationText: 'Cancel',
      confirmationKeyword: column.title
    })
      .then(() => {
        deleteColumnDetails(column._id)
      })
      .catch(() => {})
  }
  return (
    <div ref={setNodeRef} style={dndKitColumnStyles} {...attributes} >
      <Box
        {...listeners}
        sx={{
          minWidth:'300px',
          maxWidth:'300px',
          backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#333643' : '#ebecf0'),
          ml:2,
          borderRadius:'6px',
          height:'fit-content',
          maxHeight: (theme) => `calc(${theme.webCustom.boardContentHeight} - ${theme.spacing(5)})`
        }}
      >
        {/* Box Column Header */}
        <Box sx={{
          height: (theme) => theme.webCustom.columnHeaderHeight,
          p:2,
          display:'flex',
          alignItems:'center',
          justifyContent:'space-between'
        }}>
          <Typography variant='h6' sx={{
            fontSize:'1rem',
            fontWeight:'bold',
            cursor:'pointer'
          }}>
            {column?.title}
          </Typography>
          <Box>
            <Tooltip title='More options'>
              <ExpandMoreIcon
                id="basic-column-dropdown"
                aria-controls={open ? 'basic-menu-column-dropdown' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleClick}
                sx={{ color:'text.primary', cursor:'pointer' }}
              />
            </Tooltip>
            <Menu
              id="basic-menu-column-dropdown"
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              onClick={handleClose}
              MenuListProps={{
                'aria-labelledby': 'basic-column-dropdown'
              }}
            >
              <MenuItem
                onClick={toggleOpenNewCardForm}
                sx={{
                  '&:hover': {
                    color: 'success.light',
                    '& .add-card-icon': { color: 'success.light' }
                  }
                }}
              >
                <ListItemIcon><AddCardIcon className='add-card-icon' fontSize="small" /></ListItemIcon>
                <ListItemText>Add new card</ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon><ContentCut fontSize="small" /></ListItemIcon>
                <ListItemText>Cut</ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
                <ListItemText>Copy</ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon><ContentPaste fontSize="small" /></ListItemIcon>
                <ListItemText>Paste</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={handleDeleteColumn}
                sx={{
                  '&:hover': {
                    color: 'warning.dark',
                    '& .delete-forever-icon': { color: 'warning.dark' }
                  }
                }}
              >
                <ListItemIcon><DeleteForeverIcon className='delete-forever-icon' fontSize="small" /></ListItemIcon>
                <ListItemText>Delete this column</ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon><Cloud fontSize="small" /></ListItemIcon>
                <ListItemText>Archive this column</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
        {/* List Card */}
        <ListCards cards={orderedCards} />
        {/* Box Column Footer */}
        <Box sx={{
          height: (theme) => theme.webCustom.columnFooterHeight,
          p:2
        }}>
          {!openNewCardForm
            ? <Box sx={{
              height:'100%',
              display:'flex',
              alignItems:'center',
              justifyContent:'space-between'
            }}>
              <Button data-no-dnd='true' startIcon={<AddCardIcon/>} onClick={toggleOpenNewCardForm}>Add new card</Button>
              <Tooltip title='Drag to move'>
                <DragHandleIcon sx={{ cursor:'pointer' }}/>
              </Tooltip>
            </Box>
            : <Box sx={{
              height:'100%',
              display:'flex',
              alignItems:'center',
              gap:1
            }}>
              <TextField
                label="Enter card title..."
                type='text'
                size='small'
                autoFocus
                data-no-dnd='true'
                variant='outlined'
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                sx={{
                  '& label': { color:'text.primary' },
                  '& input': {
                    color: theme => theme.palette.primary.main,
                    backgroundColor: theme => (theme.palette.mode === 'dark' ? '#333643' : 'white')
                  },
                  '& label.Mui-focused': { color: theme => theme.palette.primary.main },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: theme => theme.palette.primary.main },
                    '&:hover fieldset': { borderColor: theme => theme.palette.primary.main },
                    '&.Mui-focused fieldset': { borderColor: theme => theme.palette.primary.main }
                  },
                  '& .MuiOutlinedInput-input': {
                    borderRadius: 1
                  }
                }}
              />
              <Box
                sx={{ display:'flex', alignItems:'center', gap:1 }}
              >
                <Button
                  onClick={addNewCard}
                  variant='contained' color='success' size='small' data-no-dnd='true'
                  sx={{
                    boxShadow:'none',
                    border:'0.5px solid',
                    borderColor: (theme) => theme.palette.success.main,
                    '&:hover': { backgroundColor: (theme) => theme.palette.success.main }
                  }}
                >Add</Button>
                <CloseIcon
                  fontSize='small'
                  data-no-dnd='true'
                  sx={{
                    color: (theme) => theme.palette.warning.light,
                    cursor: 'pointer'
                  }}
                  onClick={toggleOpenNewCardForm}
                />
              </Box>
            </Box>
          }
        </Box>
      </Box>
    </div>
  )
}

export default Column