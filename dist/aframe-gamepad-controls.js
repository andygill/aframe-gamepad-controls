/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	
	// Browser distrubution of the A-Frame component.
	(function (AFRAME) {
	  if (!AFRAME) {
	    console.error('Component attempted to register before AFRAME was available.');
	    return;
	  }

	  (AFRAME.aframeCore || AFRAME).registerComponent('gamepad-controls', __webpack_require__(1));

	}(window.AFRAME));


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Gamepad controls for A-Frame VR.
	 *
	 * For more information about the Gamepad API, see:
	 * https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
	 */

	var GamepadButtonEvent = __webpack_require__(2);

	var MAX_DELTA = 0.2,
	    PI_2 = Math.PI / 2;

	var JOYSTICK_EPS = 0.2;

	module.exports = {

	  dependencies: ['proxy-controls'],

	  /*******************************************************************
	  * Schema
	  */

	  schema: {
	    // Controller 0-3
	    controller:        { default: 0, oneOf: [0, 1, 2, 3] },

	    // Enable/disable features
	    enabled:           { default: true },
	    movementEnabled:   { default: true },
	    lookEnabled:       { default: true },
	    flyEnabled:        { default: false },

	    // Constants
	    easing:            { default: 20 },
	    acceleration:      { default: 65 },
	    sensitivity:       { default: 0.04 },

	    // Control axes
	    pitchAxis:         { default: 'x', oneOf: [ 'x', 'y', 'z' ] },
	    yawAxis:           { default: 'y', oneOf: [ 'x', 'y', 'z' ] },
	    rollAxis:          { default: 'z', oneOf: [ 'x', 'y', 'z' ] },

	    // Debugging
	    debug:             { default: false }
	  },

	  /*******************************************************************
	  * Core
	  */

	  /**
	   * Called once when component is attached. Generally for initial setup.
	   */
	  init: function () {
	    var scene = this.el.sceneEl;
	    this.prevTime = Date.now();

	    // Movement
	    this.velocity = new THREE.Vector3(0, 0, 0);
	    this.direction = new THREE.Vector3(0, 0, 0);
	    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

	    // Rotation
	    this.pitch = new THREE.Object3D();
	    this.yaw = new THREE.Object3D();
	    this.yaw.position.y = 10;
	    this.yaw.add(this.pitch);

	    // Button state
	    this.buttons = {};

	    scene.addBehavior(this);

	    if (!this.getGamepad()) {
	      console.warn(
	        'Gamepad #%d not found. Connect controller and press any button to continue.',
	        this.data.controller
	      );
	    }
	  },

	  /**
	   * Called when component is attached and when component data changes.
	   * Generally modifies the entity based on the data.
	   */
	  update: function (previousData) {
	    this.updatePosition(!!previousData);
	    this.updateRotation();
	    this.updateButtonState();
	  },

	  /**
	   * Called when a component is removed (e.g., via removeAttribute).
	   * Generally undoes all modifications to the entity.
	   */
	  remove: function () { },

	  /*******************************************************************
	  * Movement
	  */

	  updatePosition: function (reset) {
	    var data = this.data;
	    var acceleration = data.acceleration;
	    var easing = data.easing;
	    var velocity = this.velocity;
	    var time = window.performance.now();
	    var delta = (time - this.prevTime) / 1000;
	    var rollAxis = data.rollAxis;
	    var pitchAxis = data.pitchAxis;
	    var el = this.el;
	    var gamepad = this.getGamepad();
	    this.prevTime = time;

	    // If data has changed or FPS is too low
	    // we reset the velocity
	    if (reset || delta > MAX_DELTA) {
	      velocity[rollAxis] = 0;
	      velocity[pitchAxis] = 0;
	      return;
	    }

	    velocity[rollAxis] -= velocity[rollAxis] * easing * delta;
	    velocity[pitchAxis] -= velocity[pitchAxis] * easing * delta;

	    var position = el.getComputedAttribute('position');

	    if (data.enabled && data.movementEnabled && gamepad) {
	      if (Math.abs(this.getJoystick(0).x) > JOYSTICK_EPS) {
	        velocity[pitchAxis] += this.getJoystick(0).x * acceleration * delta;
	      }
	      if (Math.abs(this.getJoystick(0).y) > JOYSTICK_EPS) {
	        velocity[rollAxis] += this.getJoystick(0).y * acceleration * delta;
	      }
	    }

	    var movementVector = this.getMovementVector(delta);

	    el.object3D.translateX(movementVector.x);
	    el.object3D.translateY(movementVector.y);
	    el.object3D.translateZ(movementVector.z);

	    el.setAttribute('position', {
	      x: position.x + movementVector.x,
	      y: position.y + movementVector.y,
	      z: position.z + movementVector.z
	    });
	  },

	  getMovementVector: function (delta) {
	    var elRotation = this.el.getAttribute('rotation');
	    this.direction.copy(this.velocity);
	    this.direction.multiplyScalar(delta);
	    if (!elRotation) { return this.direction; }
	    if (!this.data.flyEnabled) { elRotation.x = 0; }
	    this.rotation.set(
	      THREE.Math.degToRad(elRotation.x),
	      THREE.Math.degToRad(elRotation.y),
	      0
	    );
	    this.direction.applyEuler(this.rotation);
	    return this.direction;
	  },

	  /*******************************************************************
	  * Rotation
	  */
	 
	  updateRotation: function () {
	    if (this.data.lookEnabled && this.getGamepad()) {
	      var lookVector = this.getJoystick(1);
	      if (Math.abs(lookVector.x) <= JOYSTICK_EPS) lookVector.x = 0;
	      if (Math.abs(lookVector.y) <= JOYSTICK_EPS) lookVector.y = 0;
	      lookVector.multiplyScalar(this.data.sensitivity);
	      this.yaw.rotation.y -= lookVector.x;
	      this.pitch.rotation.x -= lookVector.y;
	      this.pitch.rotation.x = Math.max(-PI_2, Math.min(PI_2, this.pitch.rotation.x));

	      this.el.setAttribute('rotation', {
	        x: THREE.Math.radToDeg(this.pitch.rotation.x),
	        y: THREE.Math.radToDeg(this.yaw.rotation.y),
	        z: 0
	      });
	    }
	  },

	  /*******************************************************************
	  * Button events
	  */

	  updateButtonState: function () {
	    var gamepad = this.getGamepad();
	    if (this.data.enabled && gamepad) {

	      // Fire DOM events for button state changes.
	      for (var i = 0; i < gamepad.buttons.length; i++) {
	        if (gamepad.buttons[i].pressed && !this.buttons[i]) {
	          this.emit(new GamepadButtonEvent('gamepadbuttondown', i, gamepad.buttons[i]));
	        } else if (!gamepad.buttons[i].pressed && this.buttons[i]) {
	          this.emit(new GamepadButtonEvent('gamepadbuttonup', i, gamepad.buttons[i]));
	        }
	        this.buttons[i] = gamepad.buttons[i].pressed;
	      }

	    } else if (Object.keys(this.buttons)) {
	      // Reset state if controls are disabled or controller is lost.
	      this.buttons = {};
	    }
	  },

	  emit: function (event) {
	    // Emit original event.
	    this.el.emit(event.type, event);

	    // Emit convenience event, identifying button index.
	    this.el.emit(
	      event.type + ':' + event.index,
	      new GamepadButtonEvent(event.type, event.index, event)
	    );
	  },

	  /*******************************************************************
	  * Gamepad state
	  */

	  /**
	   * Returns the Gamepad instance attached to the component.
	   * @return {Gamepad}
	   */
	  getGamepad: function () {
	    return navigator.getGamepads()[this.data.controller];
	  },

	  /**
	   * Returns the state of the given button.
	   * @param  {number} index The button (0-N) for which to find state.
	   * @return {GamepadButton} 
	   */
	  getButton: function (index) {
	    return this.getGamepad().buttons[index];
	  },

	  /**
	   * Returns state of the given axis. Axes are labelled 0-N, where 0-1 will
	   * represent X/Y on the first joystick, and 2-3 X/Y on the second.
	   * @param  {number} index The axis (0-N) for which to find state.
	   * @return {number} On the interval [-1,1].
	   */
	  getAxis: function (index) {
	    return this.getGamepad().axes[index];
	  },

	  /**
	   * Returns the state of the given joystick (0 or 1) as a THREE.Vector2.
	   * @param  {number} id The joystick (0, 1) for which to find state.
	   * @return {THREE.Vector2}
	   */
	  getJoystick: function (index) {
	    var gamepad = this.getGamepad();
	    switch (index) {
	      case 0: return new THREE.Vector2(gamepad.axes[0], gamepad.axes[1]);
	      case 1: return new THREE.Vector2(gamepad.axes[2], gamepad.axes[3]);
	      default: throw new Error('Unexpected joystick index "%d".', index);
	    }
	  },

	  /**
	   * Returns true if the gamepad is currently connected to the system.
	   * @return {boolean}
	   */
	  isConnected: function () {
	    return this.getGamepad().connected;
	  },

	  /**
	   * Returns a string containing some information about the controller. Result
	   * may vary across browsers, for a given controller.
	   * @return {string}
	   */
	  getId: function () {
	    return this.getGamepad().id;
	  }

	};


/***/ },
/* 2 */
/***/ function(module, exports) {

	function GamepadButtonEvent (type, index, details) {
	  this.type = type;
	  this.index = index;
	  this.pressed = details.pressed;
	  this.value = details.value;
	}

	module.exports = GamepadButtonEvent;


/***/ }
/******/ ]);