require("events").EventEmitter.defaultMaxListeners = 10000;

// "Express" initializes "app" to be a function handler that you can supply to an HTTP server
const express = require("express");
const app = express();

// Initialize a new instance of socket.io by passing the http (the HTTP server) object.
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const opn = require("opn");
const { Board, Led, Stepper, Button } = require("johnny-five");

let accelAll = 500;
let speedX = 56; //RPM Speed
let speedA = 100;
let speedZ1 = 8.8;
let speedZ2 = 8.8;
let speedZ3 = 8.8;
let speedZ4 = 8.8;
let speedZ5 = 8.8;
const speedToStartPoint = 3000;
const stepsRevX = 6400; // per the stepper driver
const stepsRevZ = 6400;
const stepsRevA = 6400;
let maxRevbackHomeX = 100000;
let maxRevbackHomeZ = 100;
let stepsX1 = 0;
let stepsX2 = 0;
let stepsX3 = 0;
let stepsX4 = 0;
let stepsX5 = 0;
let stepsZ1 = 0;
let stepsZ2 = 0;
let stepsZ3 = 0;
let stepsZ4 = 0;
let stepsZ5 = 0;
let stepsA1 = 0;
let stepsA2 = 0;
let stepsA3 = 0;
let stepsA4 = 0;
let stepsA5 = 0;
let stepsXstartPoint = 0;
let stepsZstartPoint = 0;
// let stepsAstartPoint = 0;
let screwType;
let ignoreFalseX = 0;
let ignoreFalseZ = 0;
let ignoreFalseA = 0;
// For menual Commands
let enableWeldingAndGas = 0;
// pin # on the Arduino
const LEDpin = 13;
const pinEnableX = 4;
const pinDirStepperX = 5;
const pinStepStepperX = 6;
const limitSwitchXstart = 22;
const pinEnableZ = 7;
const pinDirStepperZ = 8;
const pinStepStepperZ = 9;
const limitSwitchZstart = 26;
const pinEnableA = 10;
const pinDirStepperA = 11;
const pinStepStepperA = 12;
const limitSwitchA = 27;
const pinEnableWelding = 2;
const pinEnableGas = 3;
//,
/* can be used
const limitSwitchXmiddle = 23,
const limitSwitchXend = 24,
const limitSwitchZend = 25;
*/

const startUrl = "http://localhost:3000";
const port = 3000;
const boardPort = "COM3";

let board;
let led;
let stepperZ;
let stepperX;
let stepperA;
let buttonXstart;
let buttonZstart;
let buttonA;

///////////////////////////////////////////////////////////////
// Open COM3 when connected first time

board = new Board({ repl: false, port: boardPort }); // To connect to a specific COM port number
//Listening  to: http://localhost:port#
http.listen(port, () => {
  console.log(`listening on ${port}....`); // WebSocket Connection - Listening  to the frontend (client / user side)
});
opn(startUrl, { app: "google chrome" }); // Open Google Chrome

board.on("ready", () => {
  console.log("board is ready");

  led = new Led(LEDpin); // init a led on pin 13
  led.fadeIn(); // Turn on the LED

  board.pinMode(pinEnableWelding, board.MODES.OUTPUT);
  board.pinMode(pinEnableGas, board.MODES.OUTPUT);
  board.pinMode(pinEnableA, board.MODES.OUTPUT); // StepperA
  board.pinMode(pinEnableZ, board.MODES.OUTPUT); // StepperZ
  board.pinMode(pinEnableX, board.MODES.OUTPUT); // StepperX

  stepperZ = new Stepper({
    type: Stepper.TYPE.DRIVER,
    stepsPerRev: stepsRevZ,
    pins: {
      step: pinStepStepperZ,
      dir: pinDirStepperZ,
    },
  });
  stepperX = new Stepper({
    type: Stepper.TYPE.DRIVER,
    stepsPerRev: stepsRevX,
    pins: {
      step: pinStepStepperX,
      dir: pinDirStepperX,
    },
  });
  stepperA = new Stepper({
    type: Stepper.TYPE.DRIVER,
    stepsPerRev: stepsRevA,
    pins: {
      step: pinStepStepperA,
      dir: pinDirStepperA,
    },
  });

  buttonXstart = new Button({
    pin: limitSwitchXstart,
    isPullup: true,
  });
  // buttonXmiddle = new Button({
  //   pin: limitSwitchXmiddle,
  //   isPullup: true,
  // });
  // buttonXend = new Button({
  //   pin: limitSwitchXend,
  //   isPullup: true,
  // });
  buttonZstart = new Button({
    pin: limitSwitchZstart,
    isPullup: true,
  });
  // buttonZend = new Button({
  //   pin: limitSwitchZend,
  //   isPullup: true,
  // });
  buttonA = new Button({
    pin: limitSwitchA,
    isPullup: true,
  });
  // let buttonAPressed = false;
  // let buttonAPressStartTime = 0;
  // buttonA.on("down", () => {
  //   buttonAPressed = true;
  //   buttonAPressStartTime = Date.now();
  // });
  // buttonA.on("up", () => {
  //   buttonAPressed = false;
  // });

  // chkButtonA = setInterval(() => {
  //   if (buttonAPressed) {
  //     const elapsedTime = Date.now() - buttonAPressStartTime;
  //     if (elapsedTime >= 20) {
  //       // more than 20 ms
  //       board.digitalWrite(pinEnableWelding, 0); // Stop welding
  //       board.digitalWrite(pinEnableA, 0); // Stop motors StepperX
  //       console.log(
  //         "buttonA- A at home - ButtonA has been pressed for at least 20 ms!"
  //       );
  //       clearInterval(chkButtonA);
  //     }
  //   }
  // }, 100); // Check if the buttonAPressed variable is true every 100 milliseconds.

  buttonXstart.on("down", () => {
    if (ignoreFalseX === 0) {
      board.digitalWrite(pinEnableWelding, 0); // Stop welding
      console.log("buttonXstart- X at home");
      motors(3);
    }
  });

  buttonZstart.on("down", () => {
    if (ignoreFalseZ === 0) {
      board.digitalWrite(pinEnableWelding, 0); // Stop welding
      console.log("buttonZstart- Z at home");
      motors(4);
    }
  });

  buttonA.on("down", () => {
    if (ignoreFalseA === 0) {
      board.digitalWrite(pinEnableWelding, 0); // Stop welding
      console.log("buttonA- A at home");
      motors(5);
    }
  });
  // buttonXmiddle.on("down", function (value) {
  //   led.stop().off();
  //   board.digitalWrite(pinEnableWelding, 0); // Stop welding
  //   board.digitalWrite(pinEnableX, 0); // Stop motors StepperX
  //   console.log("buttonXmiddle - X at home");
  // });

  // buttonXend.on("down", function (value) {
  //   led.stop().off();
  //   board.digitalWrite(pinEnableWelding, 0); // Stop welding
  //   board.digitalWrite(pinEnableX, 0); // Stop motors StepperX
  //   console.log("buttonXend - X at home");
  // });

  // buttonZend.on("down", function (value) {
  //   led.stop().off();
  //   board.digitalWrite(pinEnableWelding, 0); // Stop welding
  //   board.digitalWrite(pinEnableZ, 0); // Stop motors StepperZ
  //   console.log("buttonZend - Z at home");
  // });
});

///////////////////////////////////////////////////////////////
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("disconnect", () => {
    console.log("user disconnected");
    motors(0);
  });
  // Stop welding
  socket.on("stop", (data) => {
    // screwType = `${data.screwType}x${data.screwLength}`;
    socket.emit("message1", "Stopped!"); // Emit a message to the client
    socket.emit("message2", "To continue, press Home Position"); // Emit a message to the client
    motors(0);
  });
  // Start welding and motors
  socket.on("start", (data) => {
    screwType = `${data.screwType}x${data.screwLength}`;
    stepsX1 = stepsRevX * data.revX1;
    stepsZ1 = stepsRevZ * data.revZ1;
    stepsA1 = stepsRevA * data.revA1;
    stepsX2 = stepsRevX * data.revX2;
    stepsZ2 = stepsRevZ * data.revZ2;
    stepsA2 = stepsRevA * data.revA2;
    stepsX3 = stepsRevX * data.revX3;
    stepsZ3 = stepsRevZ * data.revZ3;
    stepsA3 = stepsRevA * data.revA3;
    stepsX4 = stepsRevX * data.revX4;
    stepsZ4 = stepsRevZ * data.revZ4;
    stepsA4 = stepsRevA * data.revA4;
    stepsX5 = stepsRevX * data.revX5;
    stepsZ5 = stepsRevZ * data.revZ5;
    stepsA5 = stepsRevA * data.revA5;
    speedZ1 = data.speedZ1;
    speedZ2 = data.speedZ2;
    speedZ3 = data.speedZ3;
    speedZ4 = data.speedZ4;
    speedZ5 = data.speedZ5;
    speedX = data.speedX;
    speedA = data.speedA;
    stepsXstartPoint = stepsRevX * data.revXstartPoint;
    stepsZstartPoint = stepsRevZ * data.revZstartPoint;
    // stepsAstartPoint = stepsRevA * data.revAstartPoint;
    maxRevbackHomeX =
      stepsXstartPoint + stepsRevX * 0.5 + stepsRevX * data.TotalRevX;
    maxRevbackHomeZ =
      stepsZstartPoint - stepsRevZ * data.TotalRevZ + stepsRevZ * 2;
    socket.emit("message1", `Screw ${data.screwType}x${data.screwLength}`); // Emit a message to the client
    socket.emit("message2", "Starting..."); // Emit a message to the client
    motors(1);
  });
  // Go to home position
  socket.on("home", (data) => {
    socket.emit("message1", "Go to Home Position...");
    socket.emit("message2", "Verify Home Position");
    motors(2);
  });
  //
  socket.on("WeldingAndGasPause", (data) => {
    socket.emit("message1", "Welding and Gas are Paused"); // Emit a message to the client
    motorsManual(-3);
  });
  // Stop only Z
  socket.on("ManuelStopZ", (data) => {
    socket.emit("message1", "Stopped Z!"); // Emit a message to the client
    motorsManual(-2);
  });
  // Stop only A
  socket.on("ManuelStopA", (data) => {
    socket.emit("message1", "Stopped A!"); // Emit a message to the client
    motorsManual(-1);
  });
  // Stop only X
  socket.on("ManuelStopX", (data) => {
    socket.emit("message1", "Stopped X!"); // Emit a message to the client
    motorsManual(0);
  });
  // Enable/Disable Welding + Gas (Safety)
  socket.on("WeldOnOff", (data) => {
    enableWeldingAndGas = data.enableWelding;
    console.log(`Welding & Gas are ${enableWeldingAndGas}`);
  });
  // Move X +
  socket.on("X+", (data) => {
    speedX = data.speedX;
    socket.emit("message1", "Moving X+!"); // Emit a message to the client
    motorsManual(1);
  });
  // Move X -
  socket.on("X-", (data) => {
    speedX = data.speedX;
    socket.emit("message1", "Moving X-!"); // Emit a message to the client
    motorsManual(2);
  });
  // Move A CW
  socket.on("Acw", (data) => {
    speedA = data.speedA;
    socket.emit("message1", "Moving A CW!"); // Emit a message to the client
    motorsManual(3);
  });
  // Move A CCW
  socket.on("Accw", (data) => {
    speedA = data.speedA;
    socket.emit("message1", "Moving A CCW!"); // Emit a message to the client
    motorsManual(4);
  });
  // Move Z +
  socket.on("Z+", (data) => {
    socket.emit("message1", "Moving Z+!"); // Emit a message to the client
    motorsManual(5);
  });
  // Move Z -
  socket.on("Z-", (data) => {
    socket.emit("message1", "Moving Z-!"); // Emit a message to the client
    motorsManual(6);
  });
  // Start welding and gas
  socket.on("WeldAndGas", (data) => {
    socket.emit("message1", "Welding and Gas are Actived!"); // Emit a message to the client
    motorsManual(7);
  });
});

// For Auto mode, Stop and Home
function motors(onOffHome) {
  if (board.isReady) {
    // Stop all motors
    if (onOffHome === 0) {
      board.digitalWrite(pinEnableWelding, 0); // Stop welding
      board.digitalWrite(pinEnableGas, 0); // Stop welding
      board.digitalWrite(pinEnableA, 0); // Stop motors StepperA
      board.digitalWrite(pinEnableZ, 0); // Stop motors StepperZ
      board.digitalWrite(pinEnableX, 0); // Stop motors StepperX
      console.log("Stop (from function)");
      return;
    }
    // Start Welding
    if (onOffHome === 1) {
      board.digitalWrite(pinEnableWelding, 0); // Disaable welding
      board.digitalWrite(pinEnableGas, 0); // Start welding
      board.digitalWrite(pinEnableA, 1); // Enable motors StepperA
      board.digitalWrite(pinEnableZ, 1); // Enable motors StepperZ
      board.digitalWrite(pinEnableX, 1); // Enable motors StepperX
      led.blink(500);
      ignoreFalseX = 1; // Turn off the first switch of X axis while moves
      ignoreFalseZ = 1; // Turn off the first switch of Z axis while moves
      ignoreFalseA = 1; // Turn off the switch of A axis while moves
      // Start moving stage 0 - go to Start Point
      stepperX.step(
        {
          steps: stepsXstartPoint,
          speed: speedToStartPoint,
          accel: accelAll,
          direction: Stepper.DIRECTION.CCW,
        },
        () => {
          console.log(`Ready ${screwType} X0-Axis`);
          stepperZ.step(
            {
              steps: stepsZstartPoint,
              speed: speedToStartPoint,
              accel: accelAll,
              direction: Stepper.DIRECTION.CW,
            },
            () => {
              console.log(`Ready ${screwType} Z0-Axis`);
              console.log(`Ready ${screwType} A0-Axis`);
              // stepperA.step(
              //   {
              //     steps: stepsAstartPoint,
              //     speed: speedToStartPoint,
              //     direction: Stepper.DIRECTION.CW,
              //   },
              //   () => {
              console.log(`Start ${screwType}`);
              // Start moving stage 1
              board.digitalWrite(pinEnableWelding, 1); // Start welding
              board.digitalWrite(pinEnableGas, 1); // Start welding
              stepperX.step(
                {
                  steps: stepsX1,
                  speed: speedX,
                  direction: Stepper.DIRECTION.CCW,
                },
                () => {
                  console.log(`Done ${screwType} X1-Axis`);
                  return;
                }
              );
              stepperZ.step(
                {
                  steps: stepsZ1,
                  speed: speedZ1,
                  direction: Stepper.DIRECTION.CCW,
                },
                () => {
                  console.log(`Done ${screwType} Z1-Axis`);
                  return;
                }
              );
              stepperA.step(
                {
                  steps: stepsA1,
                  speed: speedA,
                  direction: Stepper.DIRECTION.CCW,
                },
                () => {
                  console.log(`Done ${screwType} A1-Axis`);
                  // Start moving stage 2
                  stepperX.step(
                    {
                      steps: stepsX2,
                      speed: speedX,
                      direction: Stepper.DIRECTION.CCW,
                    },
                    () => {
                      console.log(`Done ${screwType} X2-Axis`);
                      return;
                    }
                  );
                  stepperZ.step(
                    {
                      steps: stepsZ2,
                      speed: speedZ2,
                      direction: Stepper.DIRECTION.CCW,
                    },
                    () => {
                      console.log(`Done ${screwType} Z2-Axis`);
                      return;
                    }
                  );
                  stepperA.step(
                    {
                      steps: stepsA2,
                      speed: speedA,
                      direction: Stepper.DIRECTION.CCW,
                    },
                    () => {
                      console.log(`Done ${screwType} A2-Axis`);
                      // Start movinig stage 3
                      stepperX.step(
                        {
                          steps: stepsX3,
                          speed: speedX,
                          direction: Stepper.DIRECTION.CCW,
                        },
                        () => {
                          console.log(`Done ${screwType} X3-Axis`);
                          return;
                        }
                      );
                      stepperZ.step(
                        {
                          steps: stepsZ3,
                          speed: speedZ3,
                          direction: Stepper.DIRECTION.CCW,
                        },
                        () => {
                          console.log(`Done ${screwType} Z3-Axis`);
                          return;
                        }
                      );
                      stepperA.step(
                        {
                          steps: stepsA3,
                          speed: speedA,
                          direction: Stepper.DIRECTION.CCW,
                        },
                        () => {
                          console.log(`Done ${screwType} A3-Axis`);
                          // Start moving stage 4
                          stepperX.step(
                            {
                              steps: stepsX4,
                              speed: speedX,
                              direction: Stepper.DIRECTION.CCW,
                            },
                            () => {
                              console.log(`Done ${screwType} X4-Axis`);
                              return;
                            }
                          );
                          stepperZ.step(
                            {
                              steps: stepsZ4,
                              speed: speedZ4,
                              direction: Stepper.DIRECTION.CCW,
                            },
                            () => {
                              console.log(`Done ${screwType} Z4-Axis`);
                              return;
                            }
                          );
                          stepperA.step(
                            {
                              steps: stepsA4,
                              speed: speedA,
                              direction: Stepper.DIRECTION.CCW,
                            },
                            () => {
                              console.log(`Done ${screwType} A4-Axis`);
                              // Start moving stage 5
                              stepperX.step(
                                {
                                  steps: stepsX5,
                                  speed: speedX,
                                  direction: Stepper.DIRECTION.CCW,
                                },
                                () => {
                                  console.log(`Done ${screwType} X5-Axis`);
                                  return;
                                }
                              );
                              stepperZ.step(
                                {
                                  steps: stepsZ5,
                                  speed: speedZ5,
                                  direction: Stepper.DIRECTION.CCW,
                                },
                                () => {
                                  console.log(`Done ${screwType} Z5-Axis`);
                                  return;
                                }
                              );
                              stepperA.step(
                                {
                                  steps: stepsA5,
                                  speed: speedA,
                                  direction: Stepper.DIRECTION.CCW,
                                },
                                () => {
                                  board.digitalWrite(pinEnableWelding, 0); // Disaable welding
                                  console.log(`Done ${screwType} A5-Axis`);
                                  motors(2);
                                  ignoreFalseX = 0;
                                  ignoreFalseZ = 0;
                                  ignoreFalseA = 0;
                                  PreventFalseX = setInterval(() => {
                                    clearInterval(PreventFalseX);
                                    motors(2);
                                  }, 4000);
                                  return;
                                }
                              );
                              return;
                            }
                          );
                          return;
                        }
                      );
                      return;
                    }
                  );
                  return;
                }
              );
              //     return;
              //   }
              // );
              return;
            }
          );
          return;
        }
      );
      console.log(`Start All-Axis (from function)`);
      return;
    }
    ///////////////////////////////////////////////////////////////
    // All motors home
    if (onOffHome === 2) {
      board.digitalWrite(pinEnableWelding, 0); // Stop welding
      board.digitalWrite(pinEnableGas, 0); // Stop welding
      board.digitalWrite(pinEnableA, 1); // Enable motors StepperA
      board.digitalWrite(pinEnableZ, 1); // Enable motors StepperZ
      board.digitalWrite(pinEnableX, 1); // Enable motors StepperX
      led.blink(100);

      ignoreFalseX = 0;
      ignoreFalseZ = 0;
      ignoreFalseA = 0;

      stepperX.step(
        {
          steps: 1,
          speed: 3000,
          direction: Stepper.DIRECTION.CCW,
        },
        () => {
          console.log("Real Stop X!");
        }
      );
      stepperZ.step(
        {
          steps: 1,
          speed: 3000,
          direction: Stepper.DIRECTION.CW,
        },
        () => {
          console.log("Real Stop Z!");
        }
      );
      stepperA.step(
        {
          steps: 1,
          speed: 3000,
          direction: Stepper.DIRECTION.CW,
        },
        () => {
          console.log("Real Stop A!");
        }
      );

      stepperX.step(
        {
          steps: maxRevbackHomeX * stepsRevX,
          speed: 3000,
          direction: Stepper.DIRECTION.CW,
        },
        () => {
          console.log(`X-Axis at HOME`);
        }
      );
      stepperZ.step(
        {
          steps: maxRevbackHomeZ * stepsRevZ,
          speed: 3000,
          direction: Stepper.DIRECTION.CCW,
        },
        () => {
          console.log(`Z-Axis at HOME`);
        }
      );
      stepperA.step(
        {
          steps: stepsRevA,
          speed: 3000,
          direction: Stepper.DIRECTION.CCW,
        },
        () => {
          console.log(`A-Axis wait to HOME`);
        }
      );
      console.log("Home (from function)");
      return;
    }
    // move few steps from X limit switch
    if (onOffHome === 3) {
      board.digitalWrite(pinEnableWelding, 0); // Stop welding
      board.digitalWrite(pinEnableGas, 0); // Stop welding
      led.blink(50);

      stepperX.step(
        {
          steps: 0.05,
          speed: 3000,
          direction: Stepper.DIRECTION.CCW,
        },
        () => {
          console.log("Real Stop X - 2!");
          stepperX.step(
            {
              steps: stepsRevX * 0.5,
              speed: 3000,
              direction: Stepper.DIRECTION.CCW,
            },
            () => {
              board.digitalWrite(pinEnableX, 0); // Enable motors StepperX
              led.fadeIn();
              console.log(`X-Axis at safe position`);
              return;
            }
          );
        }
      );
      return;
    }
    // move few steps from Z limit switch
    if (onOffHome === 4) {
      board.digitalWrite(pinEnableWelding, 0); // Stop welding
      board.digitalWrite(pinEnableGas, 0); // Stop welding
      led.blink(50);

      stepperZ.step(
        {
          steps: 0.1,
          speed: 3000,
          direction: Stepper.DIRECTION.CW,
        },
        () => {
          console.log("Real Stop Z - 2!");
          stepperZ.step(
            {
              steps: stepsRevZ * 1,
              speed: 3000,
              direction: Stepper.DIRECTION.CW,
            },
            () => {
              board.digitalWrite(pinEnableZ, 0); // Enable motors StepperZ
              led.fadeIn();
              console.log(`Z-Axis at safe position`);
              return;
            }
          );
        }
      );
      return;
    }
    // move few steps from A limit switch
    if (onOffHome === 5) {
      board.digitalWrite(pinEnableWelding, 0); // Stop welding
      board.digitalWrite(pinEnableGas, 0); // Stop welding
      led.blink(50);
      stepperA.step(
        {
          steps: 0.1,
          speed: 3000,
          direction: Stepper.DIRECTION.CW,
        },
        () => {
          console.log("Real Stop A - 2!");
          stepperA.step(
            {
              steps: stepsRevA * 0.1,
              speed: 3000,
              direction: Stepper.DIRECTION.CW,
            },
            () => {
              board.digitalWrite(pinEnableA, 1); // Enable motors StepperZ
              led.fadeIn();
              console.log(`A-Axis at safe position`);
              return;
            }
          );
        }
      );
      return;
    }
  }
}
// For Manual Mode
function motorsManual(ControledMove) {
  if (board.isReady) {
    // ignoreFalseX = 1; // Turn off the first switch of X axis while moves
    // ignoreFalseZ = 1; // Turn off the first switch of Z axis while moves
    ignoreFalseA = 1; // Turn off the switch of A axis while moves
    if (enableWeldingAndGas === 1) {
      board.digitalWrite(pinEnableWelding, 1); // Enable welding
      board.digitalWrite(pinEnableGas, 1); // Enable Gas
    } else {
      board.digitalWrite(pinEnableWelding, 0); // Disable welding
      board.digitalWrite(pinEnableGas, 0); // Disable Gas
    }
    if (ControledMove === -3) {
      board.digitalWrite(pinEnableWelding, 0); // Enable welding
      board.digitalWrite(pinEnableGas, 0); // Enable Gas
      return;
    }
    if (ControledMove === -2) {
      if (enableWeldingAndGas === 1) {
        board.digitalWrite(pinEnableWelding, 1); // Enable welding
        board.digitalWrite(pinEnableGas, 1); // Enable Gas
      }
      board.digitalWrite(pinEnableZ, 0); // Stop motors StepperX
      return;
    }
    if (ControledMove === -1) {
      if (enableWeldingAndGas === 1) {
        board.digitalWrite(pinEnableWelding, 1); // Enable welding
        board.digitalWrite(pinEnableGas, 1); // Enable Gas
      }
      board.digitalWrite(pinEnableA, 0); // Stop motors StepperX
      return;
    }
    if (ControledMove === 0) {
      if (enableWeldingAndGas === 1) {
        board.digitalWrite(pinEnableWelding, 1); // Enable welding
        board.digitalWrite(pinEnableGas, 1); // Enable Gas
      }
      board.digitalWrite(pinEnableX, 0); // Stop motors StepperX
      return;
    }
    if (ControledMove === 1) {
      board.digitalWrite(pinEnableX, 1); // Stop motors StepperX
      stepperX.step(
        {
          steps: 100000000,
          speed: speedX,
          accel: accelAll,
          direction: Stepper.DIRECTION.CCW,
        },
        () => {}
      );
      return;
    }
    if (ControledMove === 2) {
      board.digitalWrite(pinEnableX, 1); // Stop motors StepperX
      stepperX.step(
        {
          steps: 100000000,
          speed: speedX,
          accel: accelAll,
          direction: Stepper.DIRECTION.CW,
        },
        () => {}
      );
      return;
    }
    if (ControledMove === 3) {
      board.digitalWrite(pinEnableA, 1); // Stop motors StepperX
      stepperA.step(
        {
          steps: 100000000,
          speed: speedA,
          accel: accelAll,
          direction: Stepper.DIRECTION.CW,
        },
        () => {}
      );
      return;
    }
    if (ControledMove === 4) {
      board.digitalWrite(pinEnableA, 1); // Stop motors StepperX
      stepperA.step(
        {
          steps: 100000000,
          speed: speedA,
          accel: accelAll,
          direction: Stepper.DIRECTION.CCW,
        },
        () => {}
      );
      return;
    }
    if (ControledMove === 5) {
      board.digitalWrite(pinEnableZ, 1); // Stop motors StepperX
      stepperZ.step(
        {
          steps: 100000000,
          speed: 500,
          accel: accelAll,
          direction: Stepper.DIRECTION.CW,
        },
        () => {}
      );
      return;
    }
    if (ControledMove === 6) {
      board.digitalWrite(pinEnableZ, 1); // Stop motors StepperX
      stepperZ.step(
        {
          steps: 100000000,
          speed: 500,
          accel: accelAll,
          direction: Stepper.DIRECTION.CCW,
        },
        () => {}
      );
      return;
    }
    if (ControledMove === 7) {
      ignoreFalseX = 1; // Turn off the first switch of X axis while moves
      ignoreFalseZ = 1; // Turn off the first switch of Z axis while moves
      ignoreFalseA = 1; // Turn off the switch of A axis while moves
      if (enableWeldingAndGas === 1) {
        board.digitalWrite(pinEnableWelding, 1); // Enable welding
        board.digitalWrite(pinEnableGas, 1); // Enable Gas
      } else {
        board.digitalWrite(pinEnableWelding, 0); // Disable welding
        board.digitalWrite(pinEnableGas, 0); // Disable Gas
      }
      return;
    }
  }
}

///////////////////////////////////////////////////////////////
const favicon = require("serve-favicon");
app.use(favicon(__dirname + "/img/favicon.png"));

// define a route handler "/" that gets called when we hit our website home
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/AllScrewsTypes.html");
});
//Maual
//Pedical
app.get("/Pedical", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/Pedical.html");
});
//Leg
app.get("/Leg", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/Leg.html");
});
//Welding and Gas
app.get("/WeldingandGas", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/WeldingAndGas.html");
});
//Auto
//FIVE
app.get("/Five", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/Five.html");
});
app.get("/FiveX25", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/Five/FiveX25.html");
});
app.get("/FiveX30", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/Five/FiveX30.html");
});
app.get("/FiveX35", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/Five/FiveX35.html");
});
app.get("/FiveX40", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/Five/FiveX40.html");
});
app.get("/FiveX45", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/Five/FiveX45.html");
});
//FIVE AND HALF
app.get("/FiveAndHalf", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/FiveAndHalf.html");
});
app.get("/FiveAndHalfX35", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/FiveAndHalf/FiveAndHalfX35.html");
});
app.get("/FiveAndHalfX40", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/FiveAndHalf/FiveAndHalfX40.html");
});
app.get("/FiveAndHalfX45", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/FiveAndHalf/FiveAndHalfX45.html");
});
//SIX AND HALF
app.get("/SixAndHalf", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/SixAndHalf.html");
});
app.get("/SixAndHalfX30", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/SixAndHalf/SixAndHalfX30.html");
});
app.get("/SixAndHalfX35", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/SixAndHalf/SixAndHalfX35.html");
});
app.get("/SixAndHalfX40", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/SixAndHalf/SixAndHalfX40.html");
});
app.get("/SixAndHalfX45", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/SixAndHalf/SixAndHalfX45.html");
});
app.get("/SixAndHalfX50", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/SixAndHalf/SixAndHalfX50.html");
});
app.get("/SixAndHalfX55", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/SixAndHalf/SixAndHalfX55.html");
});
// SEVEN AND HALF
app.get("/SevenAndHalf", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/SevenAndHalf.html");
});
app.get("/SevenAndHalfX35", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/SevenAndHalf/SevenAndHalfX35.html");
});
app.get("/SevenAndHalfX40", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/SevenAndHalf/SevenAndHalfX40.html");
});
app.get("/SevenAndHalfX45", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/SevenAndHalf/SevenAndHalfX45.html");
});
app.get("/SevenAndHalfX50", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/SevenAndHalf/SevenAndHalfX50.html");
});
app.get("/SevenAndHalfX55", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/SevenAndHalf/SevenAndHalfX55.html");
});
// EIGHT AND HALF
app.get("/EightAndHalf", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/EightAndHalf.html");
});
app.get("/EightAndHalfX40", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/EightAndHalf/EightAndHalfX40.html");
});
app.get("/EightAndHalfX50", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/EightAndHalf/EightAndHalfX50.html");
});
app.get("/EightAndHalfX65", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/EightAndHalf/EightAndHalfX65.html");
});
app.get("/EightAndHalfX75", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/EightAndHalf/EightAndHalfX75.html");
});
app.get("/EightAndHalfX85", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/EightAndHalf/EightAndHalfX85.html");
});
app.get("/EightAndHalfX95", (req, res) => {
  res.sendFile(__dirname + "/ScrewTypes/EightAndHalf/EightAndHalfX95.html");
});
