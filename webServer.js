// "Express" initializes "app" to be a function handler that you can supply to an HTTP server
const express = require("express");
const app = express();
// Initialize a new instance of socket.io by passing the http (the HTTP server) object.
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const opn = require("opn");
const { Board, Led, Stepper, Button } = require("johnny-five");
var speedX = 54.8, //RPM Speed
  speedZ = 8.8,
  speedA = 100,
  speedToStartPoint = 3000,
  stepsRevX = 6400, // per the stepper driver
  stepsRevZ = 6400,
  stepsRevA = 6400,
  maxRevbackHomeX = 50,
  maxRevbackHomeZ = 10,
  stepsX1 = 0,
  stepsX2 = 0,
  stepsX3 = 0,
  stepsX4 = 0,
  stepsX5 = 0,
  stepsZ1 = 0,
  stepsZ2 = 0,
  stepsZ3 = 0,
  stepsZ4 = 0,
  stepsZ5 = 0,
  stepsA1 = 0,
  stepsA2 = 0,
  stepsA3 = 0,
  stepsA4 = 0,
  stepsA5 = 0,
  stepsXstartPoint = 0,
  stepsAstartPoint = 0,
  stepsZstartPoint = 0,
  screwType,
  firstConnection = 1,
  pinStepStepperX = 7,
  pinDirStepperX = 6,
  pinEnableX = 12,
  pinStepStepperZ = 9,
  pinDirStepperZ = 8,
  pinEnableZ = 11,
  pinStepStepperA = 5,
  pinDirStepperA = 4,
  pinEnableA = 10,
  pinEnableWelding = 2,
  pinEnableGas = 3,
  ignoreFalse = 0,
  msg;

///////////////////////////////////////////////////////////////
// Open COM3 when connected first time
if (firstConnection) {
  board = new Board({ repl: false, port: "COM3" }); // To connect to a specific COM port number
  //Listenig to: http://localhost:3000/
  http.listen(3000, () => {
    console.log("listening on 3000....");
  });
  // Open Google Chrome
  opn("http://localhost:3000", { app: "google chrome" });
  // WebSocket Connection - Listenig to the frontens (client / user side)

  board.on("ready", () => {
    console.log("board is ready");
    // init a led on pin 13, blink every 1000ms
    led = new Led(13);

    board.pinMode(pinEnableWelding, board.MODES.OUTPUT);
    board.pinMode(pinEnableGas, board.MODES.OUTPUT);
    board.pinMode(pinEnableA, board.MODES.OUTPUT); // StepperX
    board.pinMode(pinEnableZ, board.MODES.OUTPUT); // StepperZ
    board.pinMode(pinEnableX, board.MODES.OUTPUT); // StepperA

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
      pin: 22,
      isPullup: true,
    });
    // buttonXmiddle = new Button({
    //   pin: 23,
    //   isPullup: true,
    // });
    // buttonXend = new Button({
    //   pin: 24,
    //   isPullup: true,
    // });
    buttonZstart = new Button({
      pin: 25,
      isPullup: true,
    });
    // buttonZend = new Button({
    //   pin: 26,
    //   isPullup: true,
    // });
    buttonA = new Button({
      pin: 27,
      isPullup: true,
    });

    let buttonAPressed = false;
    let buttonAPressStartTime = 0;

    buttonA.on("down", () => {
      buttonAPressed = true;
      buttonAPressStartTime = Date.now();
    });
    buttonA.on("up", () => {
      buttonAPressed = false;
    });

    setInterval(() => {
      if (buttonAPressed) {
        const elapsedTime = Date.now() - buttonAPressStartTime;
        if (elapsedTime >= 20) {
          // more than 20 ms
          led.stop().off();
          board.digitalWrite(pinEnableWelding, 0); // Stop welding
          board.digitalWrite(pinEnableA, 0); // Stop motors StepperX
          console.log(
            "buttonA- A at home - ButtonA has been pressed for at least 50 ms!"
          );
          return;
          // clearInterval(chkButtonA);
        }
        return;
      }
    }, 100); // Check if the buttonAPressed variable is true every 100 milliseconds.

    buttonXstart.on("down", () => {
      if (ignoreFalse === 0) {
        board.digitalWrite(pinEnableWelding, 0); // Stop welding
        console.log("buttonXstart- X at home");
        motors(3);
        return;
      }
    });

    buttonZstart.on("down", () => {
      board.digitalWrite(pinEnableWelding, 0); // Stop welding
      console.log("buttonZstart- Z at home");
      motors(4);
      return;
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
  console.log("Hello ArduinoJS");
  firstConnection = 0;
}

///////////////////////////////////////////////////////////////
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
  socket.on("stop", (data) => {
    screwType = `${data.screwType}x${data.screwLength}`;
    // Emit a message to the client
    socket.emit("message", "Stop (from server)");
    // Start welding
    msg = motors(0);
    console.log(msg);
  });
  // get screw type status from client / front
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
    stepsXstartPoint = stepsRevX * data.revXstartPoint;
    stepsZstartPoint = stepsRevZ * data.revZstartPoint;
    stepsAstartPoint = stepsRevA * data.revAstartPoint;
    maxRevbackHomeX =
      stepsXstartPoint + stepsRevX * 0.5 + stepsRevX * data.TotalRevX;
    maxRevbackHomeZ =
      stepsZstartPoint - stepsRevZ * data.TotalRevZ + stepsRevZ * 2;
    // Emit a message to the client
    socket.emit("message", "Start (from server)");
    // Start welding and motors
    msg = motors(1);
    console.log(msg);
  });
  socket.on("home", (data) => {
    socket.emit("message", "Go to home position (from server)");
    // Go to home position
    msg = motors(2);
    console.log(msg);
    socket.emit("message", msg);
  });
});

function motors(onOffHome) {
  if (board.isReady) {
    // Stop all motoros
    if (onOffHome === 0) {
      board.digitalWrite(pinEnableWelding, 0); // Stop welding
      board.digitalWrite(pinEnableGas, 0); // Stop welding
      board.digitalWrite(pinEnableA, 0); // Stop motors StepperA
      board.digitalWrite(pinEnableZ, 0); // Stop motors StepperZ
      board.digitalWrite(pinEnableX, 0); // Stop motors StepperX
      ignoreFalse = 0;
      led.stop().off();
      return "Stop (from function)";
    }
    // Start Welding
    if (onOffHome === 1) {
      board.digitalWrite(pinEnableWelding, 0); // Disaable welding
      board.digitalWrite(pinEnableA, 1); // Enable motors StepperA
      board.digitalWrite(pinEnableZ, 1); // Enable motors StepperZ
      board.digitalWrite(pinEnableX, 1); // Enable motors StepperX
      led.on();
      // Start movinig stage 0 - go to Start Point
      stepperX.step(
        {
          steps: stepsXstartPoint,
          speed: speedToStartPoint,
          direction: Stepper.DIRECTION.CCW,
        },
        () => {
          ignoreFalse = 1;
          console.log(`Ready ${screwType} X0-Axis`);
          stepperZ.step(
            {
              steps: stepsZstartPoint,
              speed: speedToStartPoint,
              direction: Stepper.DIRECTION.CW,
            },
            () => {
              console.log(`Ready ${screwType} Z0-Axis`);
              stepperA.step(
                {
                  steps: stepsAstartPoint,
                  speed: speedToStartPoint,
                  direction: Stepper.DIRECTION.CW,
                },
                () => {
                  console.log(`Ready ${screwType} A0-Axis`);
                  console.log(`Start ${screwType}`);
                  // Start movinig stage 1
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
                      speed: speedZ,
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
                      direction: Stepper.DIRECTION.CW,
                    },
                    () => {
                      console.log(`Done ${screwType} A1-Axis`);
                      // Start movinig stage 2
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
                          speed: speedZ,
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
                          direction: Stepper.DIRECTION.CW,
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
                              speed: speedZ,
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
                              direction: Stepper.DIRECTION.CW,
                            },
                            () => {
                              console.log(`Done ${screwType} A3-Axis`);
                              // Start movinig stage 4
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
                                  speed: speedZ,
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
                                  direction: Stepper.DIRECTION.CW,
                                },
                                () => {
                                  console.log(`Done ${screwType} A4-Axis`);
                                  // Start movinig stage 5
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
                                      speed: speedZ,
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
                                      direction: Stepper.DIRECTION.CW,
                                    },
                                    () => {
                                      board.digitalWrite(pinEnableWelding, 0); // Disaable welding
                                      console.log(`Done ${screwType} A5-Axis`);
                                      console.log(`Finish ${screwType}`);
                                      motors(2);
                                      ignoreFalse = 0;
                                      return `Finish ${screwType} (from server)`;
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
                  return;
                }
              );
              return;
            }
          );
          return;
        }
      );
      return `Start All-Axis (from function)`;
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

      stepperX.step(
        {
          steps: maxRevbackHomeX * stepsRevX,
          speed: 2000,
          direction: Stepper.DIRECTION.CW,
        },
        () => {
          console.log(`X-Axis at HOME`);
          return;
        }
      );
      stepperZ.step(
        {
          steps: maxRevbackHomeZ * stepsRevZ,
          speed: 2000,
          direction: Stepper.DIRECTION.CCW,
        },
        () => {
          console.log(`Z-Axis at HOME`);
          return;
        }
      );
      stepperA.step(
        {
          steps: stepsRevA * 2,
          speed: 2000,
          direction: Stepper.DIRECTION.CW,
        },
        () => {
          console.log(`A-Axis at HOME`);
          console.log(`Welcome HOME`);
          led.fadeOut();
          return;
        }
      );
      return "Home (from function)";
    }
    // move faw steps from X limit switche
    if (onOffHome === 3) {
      board.digitalWrite(pinEnableWelding, 0); // Stop welding
      board.digitalWrite(pinEnableGas, 0); // Stop welding
      led.blink(10);

      stepperX.step(
        {
          steps: stepsRevX * 0.5,
          speed: 3000,
          direction: Stepper.DIRECTION.CCW,
        },
        () => {
          // console.log(`X-Axis at safe position`);
          led.stop().off();
          board.digitalWrite(pinEnableWelding, 0); // Stop welding
          board.digitalWrite(pinEnableGas, 0); // Stop welding
          board.digitalWrite(pinEnableA, 0); // Enable motors StepperA
          board.digitalWrite(pinEnableX, 0); // Enable motors StepperX
          console.log(`X-Axis at safe position`);
          return;
        }
      );
      // stepperA.step(
      //   {
      //     steps: stepsRevA * 20,
      //     speed: 3000,
      //     direction: Stepper.DIRECTION.CCW,
      //   },
      //   () => {
      //     console.log(`A-Axis at HOME`);
      //     console.log(`Welcome HOME`);
      //     led.fadeOut();
      //   }
      // );
      return;
    }
    // move faw steps from Z limit switche
    if (onOffHome === 4) {
      board.digitalWrite(pinEnableWelding, 0); // Stop welding
      board.digitalWrite(pinEnableGas, 0); // Stop welding
      led.blink(10);

      stepperZ.step(
        {
          steps: stepsRevZ * 1,
          speed: 3000,
          direction: Stepper.DIRECTION.CW,
        },
        () => {
          // console.log(`Z-Axis at safe position`);
          led.stop().off();
          board.digitalWrite(pinEnableWelding, 0); // Stop welding
          board.digitalWrite(pinEnableA, 0); // Enable motors StepperA
          board.digitalWrite(pinEnableZ, 0); // Enable motors StepperZ
          console.log(`Z-Axis at safe position`);
          return;
        }
      );
      // stepperA.step(
      //   {
      //     steps: stepsRevA * 20,
      //     speed: 3000,
      //     direction: Stepper.DIRECTION.CCW,
      //   },
      //   () => {
      //     console.log(`A-Axis at HOME`);
      //     console.log(`Welcome HOME`);
      //     led.fadeOut();
      //   }
      // );
      return;
    }
    return;
  }
  return;
}

///////////////////////////////////////////////////////////////
const favicon = require("serve-favicon");
app.use(favicon(__dirname + "/img/favicon.png"));

// define a route handler "/" that gets called when we hit our website home
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/AllScrewsTypes.html");
});
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
