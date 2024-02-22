
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

function isCollision(a, b) {
    return !(
        ((a.y + a.height) < (b.y)) ||
        (a.y > (b.y + b.height)) ||
        ((a.x + a.width) < b.x) ||
        (a.x > (b.x + b.width))
    );
}

function detectCollisionWithSides(a, b) {
    if (
        !(
            a.y + a.height < b.y ||
            a.y > b.y + b.height ||
            a.x + a.width < b.x ||
            a.x > b.x + b.width
        )
    ) {
        // Collision detected, determine sides of collision
        let collisionSides = "";

        if (a.x < b.x) {
            collisionSides += "R"; // Collision on the right side of 'a'
        } else if (a.x > b.x) {
            collisionSides += "L"; // Collision on the left side of 'a'
        }

        if (a.y < b.y) {
            collisionSides += "B"; // Collision on the bottom side of 'a'
        } else if (a.y > b.y) {
            collisionSides += "T"; // Collision on the top side of 'a'
        }

        return collisionSides;
    }

    // No collision
    return null;
}



function checkNodeCollision() {
    nodes.forEach(bn => {
        let intersects = tree.find(bn);
        intersects?.forEach(cn => {
            if(bn === cn) return;
            let side = detectCollisionWithSides(bn, cn);
            if(side) {
                switch(side) {
                    case "LT":
                        bn.xVel = cn.xVel;
                        bn.yVel = -cn.yVel;
                    case "RT":
                        bn.xVel =  -cn.xVel;
                        bn.yVel =  -cn.yVel;
                    case "BL":
                        bn.xVel =  cn.xVel;
                        bn.yVel =  cn.yVel;
                    case "BR":
                        bn.xVel =  -cn.xVel;
                        bn.yVel =  cn.yVel;
                }
                bn.color = "yellow";
            }
            // if(isCollision(bn, cn)) {
            //     let buffer = {
            //         xVel: cn.xVel,
            //         yVel: cn.yVel
            //     }
            //     bn.xVel = cn.xVel;
            //     bn.yVel = cn.yVel;
            // }
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
    }, 10, 4, 0);

    for(let i = 0; i < 1000; i++) {
        nodes.push({
            x: Math.random() * innerWidth,
            y: Math.random() * innerHeight,
            xVel: Math.random() * 2 - 1,
            yVel: Math.random() * 2 - 1,
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