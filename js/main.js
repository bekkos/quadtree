
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

var tree;
var MOUSE = {
    x: 0,
    y: 0,
    width: 80,
    height: 40,
    isUser: true
}

var nodes = [];


/* https://github.com/timohausmann/quadtree-js.git v1.2.6 */

class TreeNode {
    constructor(x, y, width, height, color = "black", xVel = 1, yVel = 1) {
        this.x = x;
        this.y = y;
        this.xVel = xVel;
        this.yVel = yVel;
        this.width = width;
        this.height = height;
        this.color = color;
    }
}

class QuadTree {

    constructor(node, max_objects, max_levels, level) {
        this.node = node;
        this.max_objects = max_objects;
        this.max_levels = max_levels;
        this.level = level;

        this.objects = [];
        this.nodes = [];
    }

    split() {
        let nextLevel = this.level + 1;
        let sHeight = this.node.height / 2; 
        let sWidth = this.node.width / 2;
        let x = this.node.x;
        let y = this.node.y;

        //TR
        this.nodes[0] = new QuadTree({
            ...this.node,
            x: x + sWidth,
            y: y,
            width: sWidth,
            height: sHeight,
        }, this.max_objects, this.max_levels, nextLevel);

        //TL
        this.nodes[1] = new QuadTree({
            ...this.node,
            x: x,
            y: y,
            width: sWidth,
            height: sHeight,
        }, this.max_objects, this.max_levels, nextLevel);

        //BL
        this.nodes[2] = new QuadTree({
            ...this.node,
            x: x,
            y: y + sHeight,
            width: sWidth,
            height: sHeight,
        }, this.max_objects, this.max_levels, nextLevel);

        //BR
        this.nodes[3] = new QuadTree({
            ...this.node,
            x: x + sWidth,
            y: y + sHeight,
            width: sWidth,
            height: sHeight,
        }, this.max_objects, this.max_levels, nextLevel);
    }

    getIndex(node) {
        let indices = [],
        vmp = this.node.x + (this.node.width/2),
        hmp = this.node.y + (this.node.height/2);

        let startIsNorth = node.y < hmp,
        startIsWest = node.x < vmp,
        endIsEast = node.x + node.width > vmp,
        endIsSouth = node.y + node.height > hmp

        if(startIsNorth && endIsEast) indices.push(0);
        if(startIsWest && startIsNorth) indices.push(1);
        if(startIsWest && endIsSouth) indices.push(2);
        if(endIsEast && endIsSouth) indices.push(3);

        return indices;
    }

    insert(node) {
        let i = 0,
        indices;

        if(this.nodes.length) {
            indices = this.getIndex(node);

            for(i = 0; i < indices.length; i++) {
                this.nodes[indices[i]].insert(node);
            }
            return;
        }

        this.objects.push(node);

        if(this.objects.length > this.max_objects && this.level < this.max_levels) {

            if(!this.nodes.length) {
                this.split();
            }

            for(i = 0; i < this.objects.length; i++) {
                indices = this.getIndex(this.objects[i]);
                for(let j = 0; j < indices.length; j++) {
                    this.nodes[indices[j]].insert(this.objects[i]);
                }
            }

            this.objects = [];
        }
    }

    find(node) {
        let indices = this.getIndex(node),
        returnObjects = this.objects;

        if(this.nodes.length) {
            for(let i = 0; i < indices.length; i++) {
                returnObjects = returnObjects.concat(this.nodes[indices[i]].find(node));
            }
        }

        if(this.level === 0) return Array.from(new Set(returnObjects));

        return returnObjects;
    }

    clear() {
        this.objects = [];

        for(let i = 0; i < this.nodes.length; i++) {
            if(this.nodes.length) {
                this.nodes[i].clear();
            }
        }

        this.nodes = [];
    }

    draw(qt) {
        ctx.strokeStyle = "black";
        ctx.rect(qt.node.x, qt.node.y, qt.node.width, qt.node.height);
        ctx.stroke();
    }

    visualizeGrid(qt) {
        this.draw(qt);
        if(qt.nodes.length === 0) return;
        qt.nodes.forEach(t => {
            this.visualizeGrid(t);
        })
    }
}


function renderNode (node) {
    if(node.isUser) {
        ctx.strokeStyle = "blue";
        ctx.beginPath();
        ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);
        ctx.stroke();
        return;
    }
    ctx.fillStyle = node.color;
    ctx.fillRect(node.x, node.y, node.width, node.height);
}

function moveNodes () {
    nodes.forEach(n => {
        n.x += n.xVel;
        n.y += n.yVel;
    })
    checkNodeBounds()
}

function checkNodeBounds() {
    nodes.forEach(node => {
        if(node.x > innerWidth || node.x < 0) node.xVel = -node.xVel;
        if(node.y > innerHeight || node.y < 0) node.yVel = -node.yVel;
    })
}

function collide(r1,r2){
    var dx=(r1.x+r1.width/2)-(r2.x+r2.width/2);
    var dy=(r1.y+r1.height/2)-(r2.y+r2.height/2);
    var width=(r1.width+r2.width)/2;
    var height=(r1.height+r2.height)/2;
    var crossWidth=width*dy;
    var crossHeight=height*dx;
    var collision='none';
    //
    if(Math.abs(dx)<=width && Math.abs(dy)<=height){
        if(crossWidth>crossHeight){
            collision=(crossWidth>(-crossHeight))?'bottom':'left';
        }else{
            collision=(crossWidth>-(crossHeight))?'right':'top';
        }
    }
    return(collision);
}



function checkNodeCollision() {
    nodes.forEach(bn => {
        let intersects = tree.find(bn);
        intersects?.forEach(cn => {
            if(bn === cn) return;
            let side = collide(bn, cn);
            if(side) {
                switch(side) {
                    case "right":
                        if(bn.xVel > 0) {
                            bn.xVel =  -cn.xVel;
                        } else {
                        }
                    case "left":
                        if(bn.xVel > 0) {

                        } else {
                            bn.xVel =  -cn.xVel;
                        }
                    case "top":
                        if(bn.yVel > 0) {
                            
                        } else {
                            bn.yVel =  -cn.yVel;
                        }
                    case "bottom":
                        if(bn.yVel > 0) {
                            bn.yVel =  -cn.yVel;
                        } else {

                        }
                }
                bn.color = "yellow";
            }
        })
    })
}



function update() {
    checkNodeCollision()
    tree.clear();
    moveNodes();
    nodes.forEach(n => {
        tree.insert(n);
    })
    
    let intersects = tree.find({
        x: MOUSE.x,
        y: MOUSE.y,
        width: 10,
        height: 10
    });
    nodes.forEach(n => {
        n.color = "green";
    })
    intersects.forEach(n => {

        n.color = "red";
    })
}

function render() {
    ctx.clearRect(0,0,innerWidth,innerHeight);
    tree.visualizeGrid(tree)
    tree.find({
        x: 0,
        y: 0,
        width: innerWidth,
        height: innerHeight
    }).forEach(n => {
        renderNode(n)
    })
    renderNode(MOUSE);
}

function loop() {
    update();
    render();

    requestAnimationFrame(loop);
}

function init() {
    tree = new QuadTree({
        x: 0,
        y: 0,
        width: innerWidth,
        height: innerHeight
    }, 8, 6, 0);

    for(let i = 0; i < 500; i++) {
        nodes.push({
            x: Math.random() * innerWidth,
            y: Math.random() * innerHeight,
            xVel: Math.random() * 1.5 - .5,
            yVel: Math.random() * 1.5 - .5,
            width: 10,
            height: 10,
        })
    }

    requestAnimationFrame(loop);
}

init();



window.addEventListener("mousemove", (e) => {
    MOUSE.x = e.x;
    MOUSE.y = e.y;
})