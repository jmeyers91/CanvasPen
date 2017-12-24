
window.CanvasPen = function CanvasPen(options={}) {
  const {
    el=document.body,
    width=window.innerWidth,
    height=window.innerHeight,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  el.appendChild(canvas);
  const context = canvas.getContext('2d');
  const eventListeners = {};
  const plugins = [];

  const canvasPen = autobind({
    el,
    width,
    height,
    canvas,
    context,
    initialStateFn: () => ({}),
    pluginsEnabled: false,
    plugins: [],
    state: {},

    initialState(initialStateFn) {
      this.initialStateFn = initialStateFn;
      return this;
    },

    addPlugin(plugin) {
      if(typeof plugin === 'function') plugin = plugin(this);
      if(plugin) {
        if(plugin.init) plugin.init();
        this.plugins.push(plugin);
      }
      return this;
    },

    addPlugins(plugins) {
      plugins.forEach(this.addPlugin);
      return this;
    },

    enablePlugins() {
      if(!this.pluginsEnabled) {
        this.plugins.forEach((plugin) => {
          if(plugin.enable) plugin.enable();
        })
        this.pluginsEnabled = true;
      }
      return this;
    },

    disablePlugins() {
      if(this.pluginsEnabled) {
        this.plugins.forEach((plugin) => {
          if(plugin.disable) plugin.disable();
        })
        this.pluginsEnabled = false;
      }
      return this;
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
          fn(this, event || {});
        }
      }
      return this;
    },

    restart() {
      this.stop();
      this.start();
    },

    start() {
      this.state = this.initialStateFn();
      return this.enablePlugins();
    },

    stop() {
      return this.disablePlugins();
    },
  });

  canvasPen.addPlugins([
    PointerPlugin(),
    KeyboardPlugin(),
    GameloopPlugin(),
    FrameloopPlugin(),
    AutoclearPlugin(),
  ]);

  return canvasPen;
}

function FrameloopPlugin(framesPerSecond=60) {
  const frameIntervalDuration = 1000 / framesPerSecond;
  return pen => autobind({
    _enabled: false,
    _lastFrame: null,

    enable() {
      this._enabled = true;
      this._lastFrame = Date.now();
      requestAnimationFrame(this._handleFrame);
    },

    disable() {
      this._enabled = false;
    },

    _handleFrame() {
      const { _enabled, _lastFrame } = this;
      if(!_enabled) return;
      const now = Date.now();
      const deltaTime = now - _lastFrame;
      if(deltaTime > frameIntervalDuration) {
        pen.emit('before_frame');
        pen.emit('frame');
        this._lastFrame = now;
      }
      requestAnimationFrame(this._handleFrame);
    },
  });
}

function GameloopPlugin(gameStepsPerSecond=120) {
  const gameStepIntervalDuration = 1000 / gameStepsPerSecond;
  return pen => autobind({
    _gameStepInterval: null,
    _startTime: null,
    _lastGameStep: null,

    enable() {
      this._lastGameStep = this._startTime = Date.now();
      this._gameStepInterval = setInterval(this._handleStepInterval);
    },

    disable() {
      if(this._gameStepInterval != null) {
        clearInterval(this._gameStepInterval);
        this._gameStepInterval = null;
      }
    },

    _handleStepInterval() {
      const { _startTime, _lastGameStep } = this;
      const now = Date.now();
      const deltaTime = now - _lastGameStep;

      if(deltaTime > gameStepIntervalDuration) {
        const elapsed = now - _startTime;

        pen.emit('step', {
          elapsed, deltaTime,
          seconds: deltaTime / 1000,
        });
        this._lastGameStep = now;
      }
    },
  });
}

function PointerPlugin() {
  return pen => autobind({
    _boundingRectLeft: null,
    _boundingRectTop: null,
    _canvasScaleX: null,
    _canvasScaleY: null,

    _handlePointerEvent(event) {
      pen.pointer.x = (event.clientX - this._boundingRectLeft) * this._canvasScaleX;
      pen.pointer.y = (event.clientY - this._boundingRectTop) * this._canvasScaleY;
    },

    _handlePointerMove(event) {
      this._handlePointerEvent(event);
      if(pen.pointer.input > 0) {
        pen.emit('pointer:drag');
      }
      pen.emit('pointer:move');
    },

    _handlePointerDown(event) {
      this._handlePointerEvent(event);
      if(pen.pointer.input !== 1) {
        pen.pointer.input = 1;
        pen.emit('pointer:down');
      }
    },

    _handlePointerUp(event) {
      this._handlePointerEvent(event);
      if(pen.pointer.input !== 0) {
        pen.pointer.input = 0;
        pen.emit('pointer:up');
      }
    },

    enable() {
      const { canvas } = pen;
      const boundingRect = canvas.getBoundingClientRect();

      this._boundingRectLeft = boundingRect.left;
      this._boundingRectTop = boundingRect.top;
      this._canvasScaleX = canvas.width / boundingRect.width;
      this._canvasScaleY = canvas.height / boundingRect.height;

      pen.pointer = {
        x: -1,
        y: -1,
        input: 0,
      };
      canvas.addEventListener('mousemove', this._handlePointerMove);
      canvas.addEventListener('mousedown', this._handlePointerDown);
      canvas.addEventListener('mouseup', this._handlePointerUp);
    },

    disable() {
      const { canvas } = game;
      pen.pointer = null;
      canvas.addEventListener('mousemove', this._handlePointerMove);
      canvas.addEventListener('mousedown', this._handlePointerDown);
      canvas.addEventListener('mouseup', this._handlePointerUp);
    },
  });
}

function KeyboardPlugin() {
  return game => autobind({
    _keyMap: {},
    _keyLowercaseCache: {},

    _getKeyEventString(rawKeyString) {
      return this._keyLowercaseCache[rawKeyString] || (this._keyLowercaseCache[rawKeyString] = rawKeyString.toLowerCase());
    },

    enable() {
      game.keyboard = this;
      window.addEventListener('keydown', this._handleKeyDown);
      window.addEventListener('keyup', this._handleKeyUp);
    },

    disable() {
      window.removeEventListener('keydown', this._handleKeyDown);
      window.removeEventListener('keyup', this._handleKeyUp);
    },

    key(keyString) {
      return this._keyMap[this._getKeyEventString(keyString)] || 0;
    },

    isKeyDown(keyString) {
      return this.key(keyString) > 0;
    },

    _handleKeyDown(event) {
      const keyString = this._getKeyEventString(event.key);
      this._keyMap[keyString] = 1;
      const keyboardEvent = {type: 'down', key: keyString};
      game.emit('key', keyboardEvent);
      game.emit('key:down', keyboardEvent);
      game.emit('key:down:' + keyString, keyboardEvent);
    },

    _handleKeyUp(event) {
      const keyString = this._getKeyEventString(event.key);
      this._keyMap[keyString] = 0;
      const keyboardEvent = {type: 'up', key: keyString};
      game.emit('key', keyboardEvent);
      game.emit('key:up', keyboardEvent);
      game.emit('key:up:' + keyString, keyboardEvent);
    },
  });
}

function AutoclearPlugin() {
  return pen => autobind({
    _handleFrame() {
      const { context, width, height } = pen;
      pen.context.clearRect(0, 0, width, height);
    },

    enable() {
      pen.on('before_frame', this._handleFrame);
    },

    disable() {
      pen.off('before_frame', this._handleFrame);
    },
  });
}

function autobind(object) {
  return Object.entries(object).reduce((bound, [key, value]) => {
    bound[key] = typeof value === 'function' ? value.bind(bound) : value;
    return bound;
  }, {});
}
