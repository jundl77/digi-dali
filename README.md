# Digi Dali

Digi Dali stands for Digital [Dali](https://en.wikipedia.org/wiki/Salvador_Dal%C3%AD). It is a Lego robot with a laser that can englave (laser engrave) your images onto a piece of wood. 

Website: https://digidali.julianbrendl.com

Version 2: https://www.youtube.com/watch?v=Rzt6_1OoRhA

Version 1: https://www.youtube.com/watch?v=5o0GrUTllkw

I built Digi Dali in 2014, beginning in my senior high school year and ending in my freshman college year. I have not touched Digi Dali since, so please do not expect too much.

## Story
This repository is mostly for me. I lost the original code base a while ago, and am now only left with the minified, production version of the code. Thus for safeguarding purposes, I uploaded the code here, to GitHub, but with no intention of maintaining or coming back to it.

It was my first bigger project and thus has some sentimental value to me. To give you an idea of all the layers involved:

1. **Website calculates straight line segments from image.** It uses the [canny edge detection](https://en.wikipedia.org/wiki/Canny_edge_detector) (which I originally implemented myself) and an algorithm I developed to approximate straight line edges into vectors (straight line segments with start and end coordinates in this case). 
2. Straight line segements are sent **as emails via PHP backend** to a Raspberry Pi connected via bluetooth to the Lego NXT Brick (I had no port forwarding, thus my NXT brick sat behind a firewall)
4. **Rasperry Pi temporarily checks for emails** and parses line segment data from email (This is in Java because of a home automation framework I developped at the time ([Izou](https://github.com/intellimate/Izou)) and I wanted to use it with this project.
5. Rasperry Pi parses data from email and **pipes it into a C# programm** (the only bluetooth library I found to communicate with the NXT brick was in C#.)
6. C# programm **sends the data to actual NXT brick** via bluetooth
7. NXT Brick, coded in [RobotC](http://www.robotc.net/) **receives data and lasers image into wood**.

PS: If you look deep.. you might find weird things. 
