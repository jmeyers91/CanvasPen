
CanvasPen()
  .initialState(() => ({
    box: {
      x: 10,
      y: 10,
      width: 20,
      height: 20,
    }
  }))
  .on('step', ({state, pointer, keyboard}, {seconds}) => {
    const { box } = state;

    box.x += keyboard.key('d') * 10 * seconds;
    box.x += keyboard.key('a') * -10 * seconds;
    box.y += keyboard.key('s') * 10 * seconds;
    box.y += keyboard.key('w') * -10 * seconds;
  })
  .on('frame', ({state, context, pointer}) => {
    const { box } = state;
    context.strokeRect(box.x - (box.width / 2), box.y - (box.height / 2), box.width, box.height);
    if(pointer.input) {
      const width = 100;
      const height = 100;
      context.strokeRect(pointer.x - (width / 2), pointer.y - (height / 2), width, height);
    }
  })
  .start();
