(function() {
    'use strict';

    /** @const */
    var IS_IOS = /iPad|iPhone|iPod/.test(window.navigator.platform);

    /** @const */
    var IS_MOBILE = /Android/.test(window.navigator.userAgent) || IS_IOS;

    /**
     * Return the current timestamp.
     * @return {number}
     */
    function getTimeStamp() {
        return IS_IOS ? new Date().getTime() : performance.now();
    }

    /**
     * @constructor
     * @export
     */
    function Runner() {
        if (Runner.instance_) {
            return Runner.instance_;
        }
        Runner.instance_ = this;
        Runner.msPerHour = 2000;
        this.time = 0;
        this.runningTime = 0;
        this.playing = true;
        this.canvasWidth = 400;
        this.canvasHeight = 400;
        this.canvas = document.getElementById('work-canvas');
        this.canvasCtx = this.canvas.getContext('2d');
        this.container = document.getElementById('container');
        this.touchController = document.getElementById('touch-controller');
        this.imageToLoad = 3;

        this.yh = new YH(this.canvas);
        this.leader = new Leader(this.canvas);
        document.getElementById('text-space').innerHTML = "Runner Loading...";
        this.loadImages();
    }
    window['Runner'] = Runner;

        /**
     * Runner event names.
     * @enum {string}
     */
    Runner.events = {
        ANIM_END: 'webkitAnimationEnd',
        CLICK: 'click',
        KEYDOWN: 'keydown',
        KEYUP: 'keyup',
        MOUSEDOWN: 'mousedown',
        MOUSEUP: 'mouseup',
        RESIZE: 'resize',
        TOUCHEND: 'touchend',
        TOUCHSTART: 'touchstart',
        VISIBILITY: 'visibilitychange',
        BLUR: 'blur',
        FOCUS: 'focus',
        LOAD: 'load'
    };

    /**
     * @enum {string}
     */
    Runner.status = {
        INTRO: 'INTRO',
        PLAY: 'PLAY',
        SUMMARY: 'SUMMARY'
    };

    Runner.prototype = {
        loadImages: function() {
            Runner.background = document.getElementById('background');
            Runner.yhSprites = document.getElementById('yh-sprites');
            Runner.leaderSprites = document.getElementById('leader-sprites');
            this.checkLoadStatus(Runner.background);
            this.checkLoadStatus(Runner.yhSprites);
            this.checkLoadStatus(Runner.leaderSprites);
        },
        
        /**
         * @param {HTMLImageElement} image
         */
        checkLoadStatus: function(image) {
            if (image.complete) {
                this.imageToLoad -= 1;
                if (this.imageToLoad == 0) {
                    this.init();
                }
            } else {
                image.addEventListener(Runner.events.LOAD, this.updateLoadStatus.bind(this));
            }
        },

        updateLoadStatus: function() {
            this.imageToLoad -= 1;
            if (this.imageToLoad == 0) {
                this.init();
            }
        },

        init: function() {
            this.status = Runner.status.INTRO;
            document.getElementById('text-space').innerHTML = 'Start Working?';
            this.startListening();
            this.update();
        },

        startListening: function () {

            // console.info('start game....');
            // Keys.
            document.addEventListener(Runner.events.KEYDOWN, this);
            document.addEventListener(Runner.events.KEYUP, this);

            if (IS_MOBILE) {
                // Mobile only touch devices.
                this.touchController.addEventListener(Runner.events.TOUCHSTART, this);
                this.touchController.addEventListener(Runner.events.TOUCHEND, this);
                this.container.addEventListener(Runner.events.TOUCHSTART, this);
                this.container.addEventListener(Runner.events.TOUCHEND, this);
            } else {
                // Mouse.
                document.addEventListener(Runner.events.MOUSEDOWN, this);
                document.addEventListener(Runner.events.MOUSEUP, this);
            }
        },

        handleEvent: function (e) {
            return (function (evtType, events) {
                switch (evtType) {
                    case events.KEYDOWN:
                    case events.TOUCHSTART:
                    case events.MOUSEDOWN:
                        this.onKeyDown(e);
                        break;
                    case events.KEYUP:
                    case events.TOUCHEND:
                    case events.MOUSEUP:
                        this.onKeyUp(e);
                        break;
                }
            }.bind(this))(e.type, Runner.events);
        },

        update: function() {
            this.updatePending = false;
            var now = getTimeStamp();
            var deltaTime = now - (this.time || now);
            this.time = now;
            if (this.playing) {
                // clear canvas
                this.canvasCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
                if (this.status == Runner.status.PLAY) {
                    this.runningTime += deltaTime;
                }

                // draw background
                this.canvasCtx.drawImage(Runner.background, 0, 0, this.canvasWidth, this.canvasHeight);
                this.updateClock();
                
                this.yh.update(deltaTime);
                if (this.status != Runner.status.INTRO) {
                    this.leader.update(deltaTime);
                }

                // check loss
                if (this.yh.status == YH.status.RELAX && this.leader.status == Leader.status.PEEP) {
                    this.status = Runner.status.SUMMARY;
                    this.yh.setStatus(YH.status.CRY);
                    this.leader.setStatus(Leader.status.MAD);
                } else {
                    // update difficuty
                    this.leader.updateDifficuty(Math.floor(this.runningTime / Runner.msPerHour));
                }
                if (this.status != Runner.status.INTRO) {
                    if (this.status == Runner.status.SUMMARY && this.yh.timeInCurrentStatus < this.yh.minCryTime) {
                        document.getElementById('text-space').innerHTML = 
                            'You survived work for ' + Math.floor(this.runningTime / Runner.msPerHour) + ' hours... ' +
                            'Try again in ' + Math.round((this.yh.minCryTime - this.yh.timeInCurrentStatus) / 1000, 1) + 's.';
                    } else {
                        document.getElementById('text-space').innerHTML = 
                            'You survived work for ' + Math.floor(this.runningTime / Runner.msPerHour) + ' hours...';
                    }
                }

                this.scheduleNextUpdate();
            }
        },

        /**
         * Process keydown.
         * @param {Event} e
         */
        onKeyDown: function (e) {
            // Prevent native page scrolling whilst tapping on mobile.
            if (IS_MOBILE && this.playing) {
                e.preventDefault();
            }
            if (e.keyCode == 87 || e.type == Runner.events.TOUCHSTART || e.type == Runner.events.MOUSEDOWN) { // w pressed
                if (this.yh.inTheMoodToWork()) {
                    // change Runner status
                    if (this.status == Runner.status.INTRO || this.status == Runner.status.SUMMARY) {
                        this.status = Runner.status.PLAY;
                        // document.getElementById('text-space').innerHTML = 'Working...';
                        // document.getElementById('text-space').innerHTML = 
                        // 'You survived work for ' + Math.floor(this.runningTime / Runner.msPerHour) + ' hours';
                        this.leader.setStatus(Leader.status.ABSENT);
                        this.runningTime = 0;
                    } 
                    // change yh status
                    this.yh.setStatus(YH.status.WORK);
                }
            }
            


            // if (e.target != this.detailsButton) {
            //     if (!this.crashed && (Runner.keycodes.JUMP[e.keyCode] ||
            //         e.type == Runner.events.TOUCHSTART)) {
            //         if (!this.playing) {
            //             fadeOutElement();
            //             // this.loadSounds();
            //             this.playing = true;
            //             this.update();
            //             if (window.errorPageController) {
            //                 errorPageController.trackEasterEgg();
            //             }
            //         }
            //         //  Play sound effect and jump on starting the game for the first time.
            //         if (!this.tRex.jumping && !this.tRex.ducking) {
            //             this.playSound(this.soundFx.BUTTON_PRESS);
            //             this.tRex.startJump(this.currentSpeed);
            //         }
            //     }

            //     if (this.crashed && e.type == Runner.events.TOUCHSTART &&
            //         e.currentTarget == this.containerEl) {
            //         this.restart();
            //     }
            // }

            // if (this.playing && !this.crashed && Runner.keycodes.DUCK[e.keyCode]) {
            //     e.preventDefault();
            //     if (this.tRex.jumping) {
            //         // Speed drop, activated only when jump key is not pressed.
            //         this.tRex.setSpeedDrop();
            //     } else if (!this.tRex.jumping && !this.tRex.ducking) {
            //         // Duck.
            //         this.tRex.setDuck(true);
            //     }
            // }
        },


        /**
         * Process key up.
         * @param {Event} e
         */
        onKeyUp: function (e) {
            if ((e.keyCode == 87 || e.type == Runner.events.TOUCHEND || e.type == Runner.events.MOUSEUP) && 
                this.yh.status == YH.status.WORK) { // w released
                this.yh.setStatus(YH.status.RELAX);
            }
            // var keyCode = String(e.keyCode);
            // var isjumpKey = Runner.keycodes.JUMP[keyCode] ||
            //     e.type == Runner.events.TOUCHEND ||
            //     e.type == Runner.events.MOUSEDOWN;

            // if (this.isRunning() && isjumpKey) {
            //     this.tRex.endJump();
            // } else if (Runner.keycodes.DUCK[keyCode]) {
            //     this.tRex.speedDrop = false;
            //     this.tRex.setDuck(false);
            // } else if (this.crashed) {
            //     // Check that enough time has elapsed before allowing jump key to restart.
            //     var deltaTime = getTimeStamp() - this.time;

            //     if (Runner.keycodes.RESTART[keyCode] || this.isLeftClickOnCanvas(e) ||
            //         (deltaTime >= this.config.GAMEOVER_CLEAR_TIME &&
            //             Runner.keycodes.JUMP[keyCode])) {
            //         this.restart();
            //     }
            // } else if (this.paused && isjumpKey) {
            //     // Reset the jump state
            //     this.tRex.reset();
            //     this.play();
            // }
        },

        scheduleNextUpdate: function() {
            if (!this.updatePending) {
                this.updatePending = true;
                this.raqId = requestAnimationFrame(this.update.bind(this));
            }
        },

        updateClock: function() {
            var hour = this.runningTime / Runner.msPerHour;
            var handLength = 20;
            var ux = 252;
            var uy = 67;
            var vx = ux + handLength * Math.sin(Math.PI * hour / 6);
            var vy = uy - handLength * Math.cos(Math.PI * hour / 6);

            // set line stroke and line width
            this.canvasCtx.strokeStyle = 'black';
            this.canvasCtx.lineWidth = 2;

            // draw a red line
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(ux, uy);
            this.canvasCtx.lineTo(vx, vy);
            this.canvasCtx.stroke();
        }
    };

    /**
     * @param {HTMLCanvas} canvas
     * @constructor
     */
    function YH(canvas) {
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');
        this.timeInCurrentStatus = 0;
        this.maxWorkTime = 1500;
        this.minRelaxTime = 100;
        this.minCryTime = 3000;
        this.setStatus('RELAX')
    }

    /**
     * @enum {string}
     */
    YH.status = {
        RELAX: 'RELAX',
        WORK: 'WORK',
        CRY: 'CRY',
    };

    YH.prototype = {
        /**
         * @param {number} deltaTime
         */
        update: function(deltaTime) {
            this.timeInCurrentStatus += deltaTime;

            if (this.status == YH.status.WORK && this.timeInCurrentStatus > this.maxWorkTime) {
                this.setStatus(YH.status.RELAX);
            }

            // draw
            var frame = this.frameStart +
                Math.floor(this.timeInCurrentStatus / this.msPerFrame) % 
                (this.frameEnd - this.frameStart + 1);
            
            var sWidth = 120;
            var sHeight = 150;
            var sx = frame * sWidth;
            var sy = 0;
            
            var dx = 210;
            var dy = 163;
            var dWidth = 120;
            var dHeight = 150;

            this.canvasCtx.drawImage(
                Runner.yhSprites,
                sx, sy, sWidth, sHeight,
                dx, dy, dWidth, dHeight
            );
        },

        /**
         * @param {YH.status} status
         */
        setStatus: function(status) {
            this.status = status;
            this.timeInCurrentStatus = 0;
            switch(this.status) {
                case YH.status.RELAX:
                    this.frameStart = 0;
                    this.frameEnd = 4;
                    this.msPerFrame = 1000 / 7;
                    break;
                case YH.status.WORK:
                    this.frameStart = 5;
                    this.frameEnd = 8;
                    this.msPerFrame = 1000 / 21;
                    break;
                case YH.status.CRY:
                    this.frameStart = 9;
                    this.frameEnd = 11;
                    this.msPerFrame = 1000 / 7;
                    break;
            }
        },

        /**
         * @return {boolean}
         */
        inTheMoodToWork: function() {
            return (this.status == YH.status.RELAX && this.timeInCurrentStatus > this.minRelaxTime) ||
                (this.status == YH.status.CRY && this.timeInCurrentStatus > this.minCryTime);
        },
    };

    /**
     * @param {HTMLCanvas} canvas
     * @constructor
     */
    function Leader(canvas) {
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');
        this.timeInCurrentStatus = 0;
        this.setStatus(Leader.status.ABSENT);
        this.riseTime = 3000 / 7;
        this.minPeepTime = 800;
        this.maxPeepTime = 1000;
        this.minAbsentTime = 500;
        this.maxAbsentTime = 2000;
    }

    /**
     * @enum {string}
     */
    Leader.status = {
        RISE: 'RISE',
        PEEP: 'PEEP',
        LOWER: 'LOWER',
        ABSENT: 'ABSENT',
        MAD: 'MAD'
    };

    Leader.prototype = {
        /**
         * @param {number} deltaTime
         */
        update: function(deltaTime) {
            this.timeInCurrentStatus += deltaTime;
            if (this.status != Leader.status.MAD && this.timeInCurrentStatus > this.statusDuration) {
                switch(this.status) {
                    case Leader.status.RISE:
                        this.setStatus(Leader.status.PEEP);
                        break;
                    case Leader.status.PEEP:
                        this.setStatus(Leader.status.LOWER);
                        break;
                    case Leader.status.LOWER:
                        this.setStatus(Leader.status.ABSENT);
                        break;
                    case Leader.status.ABSENT:
                        this.setStatus(Leader.status.RISE);
                        break;
                }
            }

            // draw
            if (this.status != Leader.status.ABSENT) {
                var frame = 0;
                if (this.forward) {
                    frame = this.frameStart +
                        Math.floor(this.timeInCurrentStatus / this.msPerFrame) % 
                        (this.frameEnd - this.frameStart + 1);
                } else {
                    frame = this.frameEnd -
                        Math.floor(this.timeInCurrentStatus / this.msPerFrame) % 
                        (this.frameEnd - this.frameStart + 1);
                }
                
                var sWidth = 150;
                var sHeight = 150;
                var sx = frame * sWidth;
                var sy = 0;
                
                var dx = 50;
                var dy = 75;
                var dWidth = 150;
                var dHeight = 150;

                this.canvasCtx.drawImage(
                    Runner.leaderSprites,
                    sx, sy, sWidth, sHeight,
                    dx, dy, dWidth, dHeight
                );
            }
        },

        /**
         * Get random number.
         * @param {number} min
         * @param {number} max
         * @param {number}
         */
        getRandomNum: function(min, max){
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        /**
         * @param {YH.status} status
         */
        setStatus: function(status) {
            this.status = status;
            this.timeInCurrentStatus = 0;
            switch(status) {
                case Leader.status.RISE:
                    this.statusDuration = this.riseTime;
                    this.frameStart = 0;
                    this.frameEnd = 2;
                    this.msPerFrame = this.statusDuration / (this.frameEnd - this.frameStart + 1);
                    this.forward = true;
                    break;
                case Leader.status.PEEP:
                    this.statusDuration = this.getRandomNum(800, 1000);
                    this.frameStart = 3;
                    this.frameEnd = 4;
                    this.msPerFrame = 1000 / 7
                    break;
                case Leader.status.LOWER:
                    this.statusDuration = this.riseTime;
                    this.frameStart = 0;
                    this.frameEnd = 2;
                    this.msPerFrame = this.statusDuration / (this.frameEnd - this.frameStart + 1);
                    this.forward = false;
                    break;
                case Leader.status.ABSENT:
                    this.statusDuration = this.getRandomNum(500, 2500)
                    this.frameStart = NaN;
                    this.frameEnd = NaN;
                    this.msPerFrame = NaN;
                    break;
                case Leader.status.MAD:
                    this.statusDuration = NaN;
                    this.frameStart = 5;
                    this.frameEnd = 7;
                    this.msPerFrame = 1000 / 21;
                    this.forward = true;
                    break;
            }
        },

        /**
         * @param {number} hour 
         */
        updateDifficuty: function(hour) {
            // document.getElementById('text-space').innerHTML = hour;
            this.riseTime = Math.max(1000 / 7, (3000 - 50 * hour) / 7);
            this.minPeepTime = Math.min(1000, 800 + 10 * hour);
            this.maxPeepTime = Math.min(1200, 1000 + 10 * hour);
            this.minAbsentTime = Math.max(200, 500 - 10 * hour);
            this.maxAbsentTime = Math.max(1000, 1200 - 20 * hour);
        }
    };

})()

function onDocumentLoad() {
    new Runner();
}

document.addEventListener('DOMContentLoaded', onDocumentLoad);