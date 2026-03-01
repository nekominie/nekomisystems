  export const playSound = (path: string, volume?: number) => {

    if (!path) {
      return
    }

    const sound = new Audio(path)

    if (volume) {
      sound.volume = volume
    }else{
      sound.volume = 1
    }

    sound.play()
  }