import {useEffect} from 'react'
import {useOS} from './store'
import {connect, disconnect} from './net'
import BootScreen from './components/BootScreen'
import Lobby from './components/Lobby'
import Desktop from './components/Desktop'

export default function App() {
  const booted = useOS(s => s.booted)
  const roomId = useOS(s => s.roomId)

  useEffect(() => {
    if (!roomId) {
      disconnect()
      return
    }
    connect(roomId)
  }, [roomId])

  if (!booted) return <BootScreen />
  if (!roomId) return <Lobby />
  return <Desktop />
}
