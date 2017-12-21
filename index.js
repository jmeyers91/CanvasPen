// Game()
//   .on('frame', ({context, pointer}) => {
//     if(pointer.input) {
//       context.strokeRect(pointer.x, pointer.y, 200, 100);
//     }
//   })
//   .start();


window.CanvasPen = function CanvasPen(options={}) {
  const {
    el=document.body,
    width=window.innerWidth,
    height=window.innerHeight,
    framesPerSecond=60,
    stepsPerSecond=120,
    autoclear=true,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  el.appendChild(canvas);
  const context = canvas.getContext('2d');
  const eventListeners = {};
  const frameInterval = 1000 / framesPerSecond;
  const stepInterval = 1000 / stepsPerSecond;
  const boundingRect = canvas.getBoundingClientRect();
  const { left, top } = boundingRect;
  const scaleX = width / boundingRect.width;
  const scaleY = height / boundingRect.height;
  let frameLoopEnabled = false;
  let stepLoopEnabled = false;
  let stepLoopInterval;

  return autobind({
    el,
    width,
    height,
    canvas,
    context,
    startTime: Date.now(),
    lastFrame: Date.now(),
    lastStep: Date.now(),
    elapsed: 0,
    deltaTime: 0,
    pointer: {
      x: -1,
      y: -1,
      input: 0,
    },

    on(eventId, fn) {
      const listeners = eventListeners[eventId] || (eventListeners[eventId] = []);
      listeners.push(fn);
      return this;
    },

    off(eventId, fn) {
      const listeners = eventListeners[eventId] || (eventListeners[eventId] = []);
      const index = listeners.indexOf(fn);
      if(index !== -1) {
        listeners.splice(index, 1);
      }
      return this;
    },

    emit(eventId, event) {
      const listeners = eventListeners[eventId];
      if(listeners) {
        for(let fn of listeners) {
          fn(this, event);
        }
      }
      return this;
    },

    start() {
      this.addPointerListeners();
      this.startStepLoop();
      this.startFrameLoop();
      this.emit('start');
      return this;
    },

    stop() {
      this.stopFrameLoop();
      this.stopStepLoop();
    },

    startFrameLoop() {
      frameLoopEnabled = true;
      this.handleFrame();
      return this;
    },

    startStepLoop() {
      stepLoopEnabled = true;
      stepLoopInterval = setInterval(this.handleStep, stepInterval);
      this.handleStep();
      return this;
    },

    stopFrameLoop() {
      frameLoopEnabled = false;
      return this;
    },

    stopStepLoop() {
      if(stepLoopEnabled) {
        clearInterval(stepLoopInterval);
        stepLoopEnabled = false;
        stepLoopInterval = null;
      }
      return this;
    },

    handleFrame() {
      if(!frameLoopEnabled) return;
      const { lastFrame } = this;
      const now = Date.now();
      const deltaTime = now - lastFrame;
      if(deltaTime > frameInterval) {
        if(autoclear) {
          context.clearRect(0, 0, width, height);
        }
        this.emit('frame');
        this.lastFrame = now;
      }
      requestAnimationFrame(this.handleFrame);
    },

    handleStep() {
      if(!stepLoopEnabled) return;
      const { startTime, lastStep } = this;
      const now = Date.now();
      const deltaTime = now - lastStep;

      if(deltaTime > stepInterval) {
        this.deltaTime = deltaTime;
        this.elapsed = now - startTime;
        this.emit('step');
        this.lastStep = now;
      }
    },

    addPointerListeners() {
      const updatePointerPos = event => {
        this.pointer.x = (event.clientX - left) * scaleX;
        this.pointer.y = (event.clientY - top) * scaleY;
      };

      canvas.addEventListener('mousemove', (event) => {
        updatePointerPos(event);
        if(this.pointer.input > 0) {
          this.emit('pointer:drag');
        }
        this.emit('pointer:move');
      });

      canvas.addEventListener('mousedown', (event) => {
        updatePointerPos(event);
        if(this.pointer.input !== 1) {
          this.pointer.input = 1;
          this.emit('pointer:down');
        }
      });

      canvas.addEventListener('mouseup', (event) => {
        updatePointerPos(event);
        if(this.pointer.input !== 0) {
          this.pointer.input = 0;
          this.emit('pointer:up');
        }
      });
    },
  });
}

function autobind(object) {
  return Object.entries(object).reduce((bound, [key, value]) => {
    bound[key] = typeof value === 'function' ? value.bind(bound) : value;
    return bound;
  }, {});
}
