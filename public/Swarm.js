
const nCellsX = 600;
const nCellsY = 300;
var nParticles = 15000;
var editClick = true;
var input = 5;
var step = 0.1;
var dotsides = 6;
const eShift = [0, 0,   1, 0,   0, 1,  1, 1]; // states are 0,1,2,3
const componentLookUp = [0,1,2,3,  1,0,3,2,  2,3,0,1,  3,2,1,0];
var lowest_score;
var highest_score;
var best_order;
var switchTable = new Int32Array(40000);
var switchCount = [];
var mousePx = 0.5;
var mousePy = 0.5;
var fieldOfView = 45;
const shift_sequence = [0,1,2,3,1,2];
const shift_total = 6;
const actionShift = [ 0,0,0,   1,0,0,    0,1,0,   1,1,0, 
                   -1,0,0,   0,0,0,   -1,1,0,   0,1,0,
                    0,-1,0,  1,-1,0,   0,0,0,   1,0,0,  
                   -1,-1,0,  0,-1,0,  -1,0,0,   0,0,0, 
                  ];

const offSetLookUp = [ 
                      0,0,                     1/nCellsX, 0,              0,1/nCellsY ,            1/nCellsX, 1/nCellsY ,
                     -1/nCellsX, 0 ,           0,0 ,                     -1/nCellsX, 1/nCellsY ,   0, 1/nCellsY ,
                      0, -1/nCellsY ,          1/nCellsX, -1/nCellsY ,    0,0 ,                    1/nCellsX, 0 ,
                     -1/nCellsX, -1/nCellsY ,  0, -1/nCellsY ,           -1/nCellsX, 0 ,           0,0 ,
                   ];
const offSetReverseLookUp = [0.5/nCellsX, 0.5/nCellsY,     -0.5/nCellsX, 0.5/nCellsY,     0.5/nCellsX, -0.5/nCellsY,   -0.5/nCellsX, -0.5/nCellsY, 
                            -1.5/nCellsX, 0.5/nCellsY,     -0.5/nCellsX, 0.5/nCellsY,    -1.5/nCellsX, -0.5/nCellsY,   -0.5/nCellsX, -0.5/nCellsY,
                             0.5/nCellsX,-1.5/nCellsY,     -0.5/nCellsX,-1.5/nCellsY,     0.5/nCellsX, -0.5/nCellsY,   -0.5/nCellsX, -0.5/nCellsY,
                            -1.5/nCellsX,-1.5/nCellsY,     -0.5/nCellsX,-1.5/nCellsY,    -1.5/nCellsX, -0.5/nCellsY,   -0.5/nCellsX, -0.5/nCellsY,];



// Specifies how the other three components are to be organized when streaming within a quad for case 0,1,2,and 3 respectively
const streamLookUp1 = [1,2,3, 0,3,2, 3,0,1, 2,1,0];

// Specifies how the component momenta need to be exchanged according to the case of StreamLookUp1
const streamLookUp2 = [3,0,1,2,  1,0,3,2,  3,2,1,0,  1,2,3,0];








main();

//
// Start here
//
function main() 
{
  

  // Gain access to html canvas and context and check validity
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl2');
  var ext = gl.getExtension('EXT_color_buffer_float');
  var ext1 = gl.getExtension('OES_texture_float_linear');
  if (!gl) { alert('No gl context'); return;}

 
  document.addEventListener("keydown", function(e) { 
    editClick = true;
    
  
    if (e.keyCode == 40) //down 
    {
      input -= step;
    }
  
    if(e.keyCode == 38) //up  
    {
      input += step;
    }
    
    if (e.keyCode == 37) //left
    {
      if (step < 5.0)
      {
        step -= 0.1;
      }
      else
      {
        step -= 1;
      }

      if (step < 0)
      {
        step = 0;
      }

    }

 
    if(e.keyCode == 39) //right
    {
      if (step < 5)
      {
        step += 0.1;
      }
      else
      {
        step += 1;
      }

    }
    console.log("input: "+input+" Step: "+step);
  });
 
  canvas.addEventListener("mousemove", function(e) { 
    //var x = document.getElementById('canvasRow');
    //alert(x);
    editClick = true;
    var cRect = canvas.getBoundingClientRect();
         // Gets CSS pos, and width/height
    var canvasX = Math.round(e.clientX - cRect.left);  // Subtract the 'left' of the canvas 
    var canvasY = Math.round(e.clientY - cRect.top);
    //alert(canvas.width+''+''+canvas.height) ;
    mousePx = (canvasX/cRect.right) ;
    mousePy = (canvasY/cRect.height);
    clickPx = mousePx;
    clickPy = mousePy;
    document.getElementById("s0").innerText = "(x,y) = "+mousePx+", "+mousePy;

  });




  

  // Vertex shader source code
  const vsSource = `#version 300 es
    in vec4 aVertexPosition;
    in vec2 aTextureCoord;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform float uflipY;

    out highp vec2 vTextureCoord;

    void main(void) {
      vec4 temp = uProjectionMatrix * uModelViewMatrix * aVertexPosition ;
      gl_Position = temp*vec4(1, uflipY,1,1);
      vTextureCoord = aTextureCoord;
    }
  `;

  const DotVertexShader =  `#version 300 es
  in vec4 aVertexPosition;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;
  uniform float uflipY;

  out vec4 vColor;

  void main(void) {
    vec4 temp = uProjectionMatrix * uModelViewMatrix * aVertexPosition ;
    gl_Position = temp*vec4(1, uflipY,1,1);
  }
`;

  const DotFragmentShader =  `#version 300 es
  precision lowp float;
  uniform vec4 uDotColor;
  out vec4 color;

  void main(void) {
    color = uDotColor;
  }
`;

  const Render = `#version 300 es
    precision highp float;
    uniform highp isampler2D uSampler;
    in highp vec2 vTextureCoord;

    out vec4 fragColor;

    void main(void) 
    {
      
      float r  = 0.0;
      float g = 0.0;
      int id = int(texture(uSampler, vTextureCoord).r);
      int a = int(texture(uSampler, vTextureCoord).g);
      if (id == 0)
      {
        r = 0.0;
      }
      else
      {
        r = 1.0;
      }

      if (a == 0)
      {
        g = 0.0;
      }
      else
      {
        g = 1.0;
      }
      fragColor = vec4(r, 0, float(id)/500.0, 1.0);
    } `;
 
  const UpdatePosition = `#version 300 es
    precision highp float;
    uniform sampler2D uSamplerPosition;
    uniform sampler2D uSamplerVelocity;
    uniform highp isampler2D uSamplerCell;
    uniform int uNumOfParticles;

    uniform float uDeltaTime;
    in highp vec2 vTextureCoord;

    out vec4 new_position;

    void main(void) 
    {

      vec4 current_position = texture(uSamplerPosition, vTextureCoord);

      vec4 velocity_increment = texture(uSamplerVelocity, vTextureCoord); 

      new_position = current_position + velocity_increment * uDeltaTime*vec4(0.5,1.0,0.0,0.0);  
  
    } `;

  const UpdateVelocity = `#version 300 es
  precision highp float;
  uniform sampler2D uSamplerPosition;
  uniform sampler2D uSamplerVelocity;
  uniform vec2 uMousePosition;
  uniform float uForceConstant;
  uniform float uDeltaTime;
  uniform float uInvNumOfParticles;

  in highp vec2 vTextureCoord;

  out vec4 new_velocity;

  void main(void) 
  {
    // determine force

    vec2 d = uMousePosition - texture(uSamplerPosition, vTextureCoord).rg;

    if (abs(d.x) > 0.5)
      d.x = -(d.x - float(sign(d.x))*0.5);

    if (abs(d.y) > 0.5)
      d.y = -(d.y - float(sign(d.y))*0.5);

    vec2 dr = normalize(d);

    vec2 force = (dr)*uForceConstant;

 

    if ( vTextureCoord.r > uInvNumOfParticles)
    {
      new_velocity = 0.7*texture(uSamplerVelocity, vTextureCoord) + vec4(force,0.0,0.0) * uDeltaTime; 
    }
    else
    {
      new_velocity = vec4(0.0, 0.0, 0.0, 0.0);

    }
    

  } `;

  const WrapPosition = `#version 300 es
    precision highp float;
    uniform sampler2D uSamplerPosition;
    in highp vec2 vTextureCoord;

    out vec4 new_position;

    void main(void) 
    {
      vec4 t_new_position = texture(uSamplerPosition, vTextureCoord);
      new_position =  t_new_position - floor(t_new_position);               
    } `;

  const UpdateAction = `#version 300 es
    precision highp float;

    uniform sampler2D uSamplerPosition0;
    uniform sampler2D uSamplerPosition1;
    uniform highp isampler2D uSamplerAction2;
    uniform vec4 uCellSpaceSize;
    in highp vec2 vTextureCoord;

    out ivec4 new_action;

    void main(void) 
    {

      // determine position of old cell
      ivec4 c0 = ivec4(floor(texture(uSamplerPosition0, vTextureCoord) * uCellSpaceSize));
      ivec4 c1 = ivec4(floor(texture(uSamplerPosition1, vTextureCoord) * uCellSpaceSize));
      new_action = texture(uSamplerAction2, vTextureCoord) +  c0 - c1;
                     
    } `;

  const UpdateCellAction = `#version 300 es
    precision highp float;
    uniform highp isampler2D uSamplerCell0;
    uniform highp isampler2D uSamplerAction1;
    uniform float uParticlesInv;
    in highp vec2 vTextureCoord;

    out ivec4 new_c;

    void main(void) 
    {
      ivec4 c = texture(uSamplerCell0, vTextureCoord);
      ivec4 a = texelFetch(uSamplerAction1, ivec2(c.r,0), 0);
      
      ivec3 new_action = c.gba + a.rgb;

      ivec3 true_if_small = sign(sign(ivec3(2,2,2) - abs(new_action)) + 1);
      new_action = sign(new_action)*ivec3(2,2,2)*(1-true_if_small) + new_action*(true_if_small);
      new_c = ivec4(c.r, new_action); 
    } `;

  const Exchange = `#version 300 es
    precision highp float;
    uniform highp isampler2D uSamplerCell0;
    uniform highp isampler2D uSamplerSwitch1;
    uniform vec2 uOffSet[4];
    in highp vec2 vTextureCoord;

    out ivec4 exchange;

    void main(void) 
    {
      ivec4 c0 = texture(uSamplerCell0, vTextureCoord + uOffSet[0]);
      ivec4 c1 = texture(uSamplerCell0, vTextureCoord + uOffSet[1]);
      ivec4 c2 = texture(uSamplerCell0, vTextureCoord + uOffSet[2]);
      ivec4 c3 = texture(uSamplerCell0, vTextureCoord + uOffSet[3]);

      int c0_i = sign(c0.r)*(sign(c0.r) + 3*(1+sign(c0.g)) + (1+sign(c0.b)));
      int c1_i = sign(c1.r)*(sign(c1.r) + 3*(1+sign(c1.g)) + (1+sign(c1.b))); 
      int c2_i = sign(c2.r)*(sign(c2.r) + 3*(1+sign(c2.g)) + (1+sign(c2.b)));
      int c3_i = sign(c3.r)*(sign(c3.r) + 3*(1+sign(c3.g)) + (1+sign(c3.b)));

      int y_index = c0_i*10 + c1_i;
      int x_index = c2_i*10 + c3_i;
      
      float x_index_f = float(x_index)*0.01 + 0.005;
      float y_index_f = float(y_index)*0.01 + 0.005;
      //exchange = ivec4(100.0*(vTextureCoord),100.0*(vTextureCoord));
      exchange = texture(uSamplerSwitch1, vec2(x_index_f, y_index_f));

    } `;

  const QuadCompress = `#version 300 es
  precision highp float;
  uniform highp isampler2D uSamplerCell0;
  uniform vec2 uOffSetc1;
  uniform vec2 uOffSetc2;
  uniform vec2 uOffSetc3;
  uniform vec2 uOffSetc4;
  in highp vec2 vTextureCoord;

  out ivec4 quad_compress;

  void main(void) 
  {
    quad_compress = ivec4( texture(uSamplerCell0, vTextureCoord + uOffSetc1).r,
                           texture(uSamplerCell0, vTextureCoord + uOffSetc2).r,
                           texture(uSamplerCell0, vTextureCoord + uOffSetc3).r,
                           texture(uSamplerCell0, vTextureCoord + uOffSetc4).r);
  } `;

  const QuadAvgVelocity = `#version 300 es
    precision highp float;
    uniform highp isampler2D uSamplerCell;
    uniform sampler2D uSamplerVelocity;
    uniform vec2 uOffSet[4];
    in highp vec2 vTextureCoord;

    out vec4 avg_velocity;

    void main(void) 
    {
      int p_id_0 = texture(uSamplerCell, vTextureCoord + uOffSet[0]).r;
      int p_id_1 = texture(uSamplerCell, vTextureCoord + uOffSet[1]).r;
      int p_id_2 = texture(uSamplerCell, vTextureCoord + uOffSet[2]).r;
      int p_id_3 = texture(uSamplerCell, vTextureCoord + uOffSet[3]).r;

      vec4 p_vel_0 = texelFetch(uSamplerVelocity, ivec2(p_id_0, 0), 0);
      vec4 p_vel_1 = texelFetch(uSamplerVelocity, ivec2(p_id_1, 0), 0);
      vec4 p_vel_2 = texelFetch(uSamplerVelocity, ivec2(p_id_2, 0), 0);
      vec4 p_vel_3 = texelFetch(uSamplerVelocity, ivec2(p_id_3, 0), 0);

      vec4 sum_velocity = p_vel_0 + p_vel_1 + p_vel_2 + p_vel_3;
      float count = float(sign(p_id_0) + sign(p_id_1) + sign(p_id_2) +  sign(p_id_3));
      
      avg_velocity = vec4(sum_velocity.rgb, count);
    } `;

  const UpdateVelocityViaQuadAvg = `#version 300 es
  precision highp float;
  uniform sampler2D uSamplerPiC;
  uniform sampler2D uSamplerAvgVelocity;
  uniform sampler2D uSamplerVelocity;
  uniform vec2 uExShiftOffSet;
  uniform float uTao;
  uniform float uInvNumOfParticles;
  
  in highp vec2 vTextureCoord;

  out vec4 new_velocity;

  void main(void) 
  {
    vec2 pos_in_cell = texture(uSamplerPiC, vTextureCoord).rg;
    vec4 avg_velocity_data = texture(uSamplerAvgVelocity, pos_in_cell + uExShiftOffSet);

    vec4 avg_velocity = vec4(avg_velocity_data[0]/avg_velocity_data[3],avg_velocity_data[1]/avg_velocity_data[3],0.0, 0.0);

    if ( vTextureCoord.r > uInvNumOfParticles)
    {
       new_velocity = (1.0-uTao)*texture(uSamplerVelocity,vTextureCoord) + uTao*avg_velocity;
      //new_velocity = avg_velocity;
    }
    else
    {
      new_velocity = vec4(0.0,0.0,0.0,0.0);
    } 
   
  } `;
  
  const UpdateCellState = `#version 300 es
    precision highp float;
    uniform highp isampler2D uSamplerCell0;
    uniform highp isampler2D uSamplerExchange1;
    uniform int  uShiftState;
    uniform vec2 uOffSetReverseLookUp[16];
    uniform vec2 uCellSpaceSize;
    uniform int uComponentLookUp[16];
    uniform vec2 uOffSetLookUp[16];
    uniform ivec3 uActionShift[16];
   

    
    in highp vec2 vTextureCoord;

    out ivec4 new_cell_data;

    void main(void) 
    {
      ivec2 g2 = ivec2(vTextureCoord * uCellSpaceSize) % 2;
      int g = 2*g2.y + g2.x;
     
      int component = uComponentLookUp[4*g +uShiftState];

      vec2 reverseOffSet = uOffSetReverseLookUp[4*uShiftState + g];
      ivec4 exchange_data = texture(uSamplerExchange1, vTextureCoord + reverseOffSet);
      
      
      int new_component =  exchange_data[component];
      
      int index = 4*component + new_component;
      
      vec2 texture_offset = uOffSetLookUp[index];
      ivec3 actionShift = uActionShift[index];
      
      ivec4 cell_data = texture(uSamplerCell0, vTextureCoord + texture_offset);

      // return correct cell data and adjust the action due to the change
      //new_cell_data = ivec4(100.0*(vTextureCoord + reverseOffSet) ,0,0);
      //new_cell_data = ivec4(g,component, new_component, index);
      //new_cell_data = exchange_data;
      new_cell_data = cell_data + ivec4(0, actionShift)*sign(cell_data.r);

    } `;

  const UpdateParticleInCell = `#version 300 es
  precision highp float;
  uniform sampler2D uSamplerParticleInCell;
  uniform highp isampler2D uSamplerExchange;
  uniform int uComponentLookUp[16];
  uniform int  uShiftState;
  uniform vec2 uExShiftOffSet;
  uniform vec2 uCellSpaceSize;
  uniform vec2 uOffSetLookUp[16];

  in highp vec2 vTextureCoord;

  out vec4 new_position;

  void main(void) 
  {
    vec4 particle_position = texture(uSamplerParticleInCell, vTextureCoord);


    ivec2 g2 = ivec2(particle_position.rg * uCellSpaceSize) % 2;
    int g = 2*g2.y + g2.x;
    int p_old_component = uComponentLookUp[4*g +uShiftState];

    ivec4 exchange_data = texture(uSamplerExchange,  particle_position.rg + uExShiftOffSet);

    ivec4 p_component_vector = ivec4(1,1,1,1) - abs(sign(ivec4(p_old_component,p_old_component,p_old_component,p_old_component) - exchange_data));
    int p_new_component = int(dot(vec4(0,1,2,3), vec4(p_component_vector)));
 
    int index = 4*p_old_component + p_new_component;
    
    vec2 p_offset = uOffSetLookUp[index];
    vec4 t_new_position = particle_position + vec4(p_offset,0.0,0.0);
    new_position =  t_new_position - floor(t_new_position); 
  } `;

  const UpdatePositionWithParticleInCell = `#version 300 es
  precision highp float;
  uniform sampler2D uSamplerPosition;
  uniform sampler2D uSamplerParticleInCell;
  uniform vec2 uCellSpaceSize;
  uniform vec2 uInvCellSpaceSize;
  uniform float uInvNumOfParticles;

  in highp vec2 vTextureCoord;

  out vec4 new_position;

  void main(void) 
  {
    
    vec4 new_pic_position = texture(uSamplerParticleInCell, vTextureCoord);

    vec4 position = texture(uSamplerPosition, vTextureCoord);



    vec4 delta = vec4(floor(  ((position - new_pic_position)*vec4(uCellSpaceSize,0.0,0.0)) + vec4(0.5,0.5,0,0) ));

    if (vTextureCoord.r > uInvNumOfParticles)
    {
      new_position = position - 1.0*delta*vec4(uInvCellSpaceSize.x,uInvCellSpaceSize.y,0.0,0.0);
    }
    else
    {
      new_position = vec4(0.0,0.0,0.0,0.0);
    }

  } `;

  const UpdateVelocityPiC = `#version 300 es
  precision highp float;
  uniform sampler2D uSamplerVelocity;
  uniform sampler2D uSamplerPosition;
  uniform sampler2D uSamplerParticleInCell;
  uniform float uForceConstant;
  uniform float uDeltaTime;
  uniform float uInvNumOfParticles;
  
  in highp vec2 vTextureCoord;

  out vec4 new_velocity;

  void main(void) 
  {
    vec4 p = texture(uSamplerPosition, vTextureCoord);
    vec4 pic = texture(uSamplerParticleInCell, vTextureCoord);
    vec4 r = pic - p;

    if (abs(r.x) > 1.0)
      r.x = -1.0*(r.x -sign(r.x));
    if ((abs(r.y) > 1.0))
      r.y = -1.0*(r.y -sign(r.y));

    float force = length(r)*uForceConstant;
    vec4 dr = normalize(r);
 

    if ( vTextureCoord.r > uInvNumOfParticles)
    {
      new_velocity = texture(uSamplerVelocity, vTextureCoord) + force*dr;
    }
    else
    {
      new_velocity = vec4(0.0, 0.0, 0.0, 0.0);
    }
    
 
  } `;

  const StreamLBM = `#version 300 es
  precision highp float;
  uniform sampler2D uSamplerCellPosition;
  uniform highp isampler2D uSamplerQuadData;
  uniform sampler2D uSamplerMomenta;
  uniform sampler2D uSamplerMomentaDelta;
  uniform int  uShiftState;
  uniform vec2 uShiftOffSet;
  uniform vec2 uCellSpaceSize;
  uniform int uComponentLookUp[16];
  uniform ivec3 uLookUp1[4]; 
  uniform ivec4 uLookUp2[4];
  
  in highp vec2 vTextureCoord;

  out vec4 new_momenta;

  void main(void) 
  {
    vec2 cell_position = texture(uSamplerCellPosition, vTextureCoord).rg;
    
    ivec4 quad_ids = texture(uSamplerQuadData, cell_position + uShiftOffSet);

    
    // we now have the relevant particle ID's which we can exchange momenta with
    // we need to know what position (component) we are in relative to the quad i.e. 0,1,2, or 3

    ivec2 g2 = ivec2(cell_position * uCellSpaceSize) % 2;
    int g = 2*g2.y + g2.x;
    // g is the global position
    // component is what position the particle is within the quad
    int c = uComponentLookUp[4*g + uShiftState];

    // according to our component we should loop through each other component and carry out the exchange process
    // uLookUp1 places the other three cells into a horizonally related cell (H), vertically related cell (V), and  a diagonally related cell (D)


    ivec3 id_components =  uLookUp1[c];
    int id_H = quad_ids[id_components.r];
    int id_V = quad_ids[id_components.g];
    int id_D = quad_ids[id_components.b];

    
    //look up momenta data from mtex
    vec4 X = texture(uSamplerMomenta, vTextureCoord);
    vec4 H = texelFetch(uSamplerMomenta, ivec2(id_H,0), 0);
    vec4 V = texelFetch(uSamplerMomenta, ivec2(id_V,0), 0);
    vec4 D = texelFetch(uSamplerMomenta, ivec2(id_D,0), 0);
  
    float alpha = 0.2;
    float beta = 0.2;

    vec4 Y = vec4(0.0,0.0,0.0,0.0);

    ivec4 O = uLookUp2[c];
    Y[O.r] = alpha*H[O.r] + beta*D[O.r];
    Y[O.g] = alpha*V[O.g] + beta*D[O.g];

    Y[O.b] = -(alpha*float(sign(id_H)) + beta*float(sign(id_D)) )*X[O.b];
    Y[O.a] = -(alpha*float(sign(id_V)) + beta*float(sign(id_D)) )*X[O.a];

    new_momenta = texture(uSamplerMomentaDelta, vTextureCoord) + Y;

   
  } `;

  const ConvertVelocityToMomenta = `#version 300 es
  precision highp float;
  uniform sampler2D uSamplerVelocity;
  uniform float uInvNumOfParticles;
  in highp vec2 vTextureCoord;

  out vec4 momenta;

  void main(void) 
  {
    float base_load = 0.7;

    vec4 Y = vec4(base_load, base_load, base_load, base_load);
    vec4 vel = texture(uSamplerVelocity, vTextureCoord);

    if (vel.r > 0.0)
      Y[1] += vel.r;
    else
      Y[3] += -vel.r;

    if (vel.g > 0.0)
      Y[2] += vel.g;
    else
      Y[0] += -vel.g;

   
      //momenta = Y;
      if ( vTextureCoord.r > uInvNumOfParticles)
      {
      momenta = Y;
      }
      else
      {
      momenta = vec4(0.0, 0.0, 0.0, 0.0);
      } 
  } `;

  const ConvertMomentaToVelocity = `#version 300 es
  precision highp float;
  uniform sampler2D uSamplerMomenta;
  uniform float uInvNumOfParticles;
  in highp vec2 vTextureCoord;

  out vec4 velocity;

  void main(void) 
  {
    vec4 momenta = texture(uSamplerMomenta, vTextureCoord);
  
    //velocity = vec4(momenta.g - momenta.a, momenta.b - momenta.r,  0.0, 0.0);
    
    if ( vTextureCoord.r > uInvNumOfParticles)
    {
      velocity = vec4(momenta.g - momenta.a, momenta.b - momenta.r,  0.0, 0.0);
    }
    else
    {
      velocity = vec4(0.0, 0.0, 0.0, 0.0);
    } 

  } `;

  const StreamLBMPart2 = `#version 300 es
  precision highp float;
  uniform sampler2D uSamplerMomenta;
  uniform sampler2D uSamplerMomentaDelta;
  in highp vec2 vTextureCoord;

  out vec4 new_momenta;

  void main(void) 
  {
    new_momenta = texture(uSamplerMomenta,vTextureCoord) + texture(uSamplerMomentaDelta, vTextureCoord);
  } `;

  const ClearFloatTexture = `#version 300 es
  precision highp float;
  in highp vec2 vTextureCoord;

  out vec4 float_tex;

  void main(void) 
  {
    float_tex = vec4(0.0,  0.0,  0.0,  0.0);
  } `;
  
  const ClearAction = `#version 300 es
  precision highp float;
  in highp vec2 vTextureCoord;

  out ivec4 action;

  void main(void) 
  {
    action = ivec4(0,0,0,0);
  } `;

 
   
  // Initialize shader programs
  const program_RenderDot = initShaderProgram(gl, DotVertexShader, DotFragmentShader);
  const program_Render = initShaderProgram(gl, vsSource, Render);
  const program_UpdatePosition = initShaderProgram(gl, vsSource, UpdatePosition);
  const program_WrapPosition = initShaderProgram(gl, vsSource, WrapPosition);
  const program_UpdateAction = initShaderProgram(gl, vsSource, UpdateAction);
  const program_UpdateCellAction = initShaderProgram(gl, vsSource, UpdateCellAction);
  const program_Exchange = initShaderProgram(gl, vsSource, Exchange);
  const program_UpdateCellState = initShaderProgram(gl, vsSource, UpdateCellState);
  const program_UpdateParticleInCell = initShaderProgram(gl, vsSource, UpdateParticleInCell);
  const program_ClearAction = initShaderProgram(gl, vsSource, ClearAction);
  const program_UpdateVelocity = initShaderProgram(gl, vsSource, UpdateVelocity);
  const program_UpdateVelocityPiC = initShaderProgram(gl, vsSource, UpdateVelocityPiC);
  const program_QuadCompress = initShaderProgram(gl, vsSource, QuadCompress);
  const program_QuadAvgVelocity = initShaderProgram(gl, vsSource, QuadAvgVelocity);
  const program_UpdateVelocityViaQuadAvg = initShaderProgram(gl, vsSource, UpdateVelocityViaQuadAvg);
  const program_StreamLBM = initShaderProgram(gl, vsSource, StreamLBM);
  const program_StreamLBMPart2 = initShaderProgram(gl, vsSource, StreamLBMPart2);
  const program_ConvertVelocityToMomenta = initShaderProgram(gl, vsSource, ConvertVelocityToMomenta);
  const program_ConvertMomentaToVelocity = initShaderProgram(gl, vsSource, ConvertMomentaToVelocity);
  const program_ClearFloatTexture = initShaderProgram(gl, vsSource, ClearFloatTexture);
  const program_UpdatePositionWithParticleInCell = initShaderProgram(gl, vsSource, UpdatePositionWithParticleInCell);

  
  const programInfo_RenderDot = 
  {
    program: program_RenderDot,
      attribLocations: 
      {
        vertexPosition: gl.getAttribLocation(program_RenderDot, 'aVertexPosition'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_RenderDot, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_RenderDot, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_RenderDot,'uflipY'),
        uDotColor: gl.getUniformLocation(program_RenderDot, 'uDotColor'),   
       },
  };

  const programInfo_Render = 
  {
    program: program_Render,
      attribLocations: 
      {
        vertexPosition: gl.getAttribLocation(program_Render, 'aVertexPosition'),
        textureCoord: gl.getAttribLocation(program_Render, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_Render, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_Render, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_Render,'uflipY'),
        uSampler: gl.getUniformLocation(program_Render, 'uSampler'),   
       },
  };

  const programInfo_UpdatePosition = 
  {
    program: program_UpdatePosition,
      attribLocations: 
      {
        vertexPosition: gl.getAttribLocation(program_UpdatePosition, 'aVertexPosition'),
        textureCoord: gl.getAttribLocation(program_UpdatePosition, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_UpdatePosition, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_UpdatePosition, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_UpdatePosition,'uflipY'),
        uSamplerPosition: gl.getUniformLocation(program_UpdatePosition, 'uSamplerPosition'),   
        uSamplerVelocity: gl.getUniformLocation(program_UpdatePosition, 'uSamplerVelocity'),
        uSamplerCell: gl.getUniformLocation(program_UpdatePosition, 'uSamplerCell'),
        uNumOfParticles: gl.getUniformLocation(program_UpdatePosition, 'uNumOfParticles'),
        uDeltaTime: gl.getUniformLocation(program_UpdatePosition, 'uDeltaTime'),  
       },
  };

  const programInfo_UpdatePositionWithParticleInCell = 
  {
    program: program_UpdatePositionWithParticleInCell,
      attribLocations: 
      {
        vertexPosition: gl.getAttribLocation(program_UpdatePositionWithParticleInCell, 'aVertexPosition'),
        textureCoord: gl.getAttribLocation(program_UpdatePositionWithParticleInCell, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_UpdatePositionWithParticleInCell, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_UpdatePositionWithParticleInCell, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_UpdatePositionWithParticleInCell,'uflipY'),
        uSamplerPosition: gl.getUniformLocation(program_UpdatePositionWithParticleInCell, 'uSamplerPosition'),   
        uSamplerParticleInCell: gl.getUniformLocation(program_UpdatePositionWithParticleInCell, 'uSamplerParticleInCell'),
        uCellSpaceSize: gl.getUniformLocation(program_UpdatePositionWithParticleInCell, 'uCellSpaceSize'),
        uInvCellSpaceSize: gl.getUniformLocation(program_UpdatePositionWithParticleInCell, 'uInvCellSpaceSize'),
        uInvNumOfParticles: gl.getUniformLocation(program_UpdatePositionWithParticleInCell, 'uInvNumOfParticles'),
       },
  };



  const programInfo_WrapPosition = 
  {
    program: program_WrapPosition,
      attribLocations: 
      {
        vertexPosition: gl.getAttribLocation(program_WrapPosition, 'aVertexPosition'),
        textureCoord: gl.getAttribLocation(program_WrapPosition, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_WrapPosition, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_WrapPosition, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_WrapPosition,'uflipY'),
        uSamplerPosition: gl.getUniformLocation(program_WrapPosition, 'uSamplerPosition'),   
       },
  };

  const programInfo_UpdateAction = 
  {
    program: program_UpdateAction,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_UpdateAction, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_UpdateAction, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_UpdateAction, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_UpdateAction, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_UpdateAction,'uflipY'),
        uSamplerPosition0: gl.getUniformLocation(program_UpdateAction, 'uSamplerPosition0'),
        uSamplerPosition1: gl.getUniformLocation(program_UpdateAction, 'uSamplerPosition1'),
        uSamplerAction2: gl.getUniformLocation(program_UpdateAction, 'uSamplerAction2'), 
        uCellSpaceSize: gl.getUniformLocation(program_UpdateAction, 'uCellSpaceSize'),  
       },
  };

  const programInfo_UpdateCellAction = 
  {
    program: program_UpdateCellAction,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_UpdateCellAction, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_UpdateCellAction, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_UpdateCellAction, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_UpdateCellAction, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_UpdateCellAction,'uflipY'),
        uSamplerCell0: gl.getUniformLocation(program_UpdateCellAction, 'uSamplerCell0'), 
        uSamplerAction1: gl.getUniformLocation(program_UpdateCellAction, 'uSamplerAction1'), 
        uParticlesInv: gl.getUniformLocation(program_UpdateCellAction, 'uParticlesInv'),  
       },
  };

  const programInfo_Exchange = 
  {
    program: program_Exchange,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_Exchange, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_Exchange, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_Exchange, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_Exchange, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_Exchange,'uflipY'),
        uSamplerCell0: gl.getUniformLocation(program_Exchange, 'uSamplerCell0'),
        uSamplerSwitch1: gl.getUniformLocation(program_Exchange, 'uSamplerSwitch1'),
        uOffSet: gl.getUniformLocation(program_Exchange, 'uOffSet'),
        uParticlesInv: gl.getUniformLocation(program_Exchange, 'uParticlesInv'),  
       },
  };

  const programInfo_QuadAvgVelocity = 
  {
    program: program_QuadAvgVelocity,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_QuadAvgVelocity, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_QuadAvgVelocity, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_QuadAvgVelocity, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_QuadAvgVelocity, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_QuadAvgVelocity,'uflipY'),
        uSamplerCell: gl.getUniformLocation(program_QuadAvgVelocity, 'uSamplerCell'),
        uSamplerVelocity: gl.getUniformLocation(program_QuadAvgVelocity, 'uSamplerVelocity'),
        uOffSet: gl.getUniformLocation(program_QuadAvgVelocity, 'uOffSet'),
       },
  };

  const programInfo_QuadCompress = 
  {
    program: program_QuadCompress,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_QuadCompress, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_QuadCompress, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_QuadCompress, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_QuadCompress, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_QuadCompress,'uflipY'),
        uSamplerCell0: gl.getUniformLocation(program_QuadCompress, 'uSamplerCell0'),
        uOffSetc1: gl.getUniformLocation(program_QuadCompress, 'uOffSetc1'),
        uOffSetc2: gl.getUniformLocation(program_QuadCompress, 'uOffSetc2'), 
        uOffSetc3: gl.getUniformLocation(program_QuadCompress, 'uOffSetc3'), 
        uOffSetc4: gl.getUniformLocation(program_QuadCompress, 'uOffSetc4'), 
       },
  };

  const programInfo_UpdateCellState = 
  {
    program: program_UpdateCellState,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_UpdateCellState, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_UpdateCellState, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_UpdateCellState, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_UpdateCellState, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_UpdateCellState,'uflipY'),
        uSamplerCell0: gl.getUniformLocation(program_UpdateCellState, 'uSamplerCell0'), 
        uSamplerExchange1: gl.getUniformLocation(program_UpdateCellState, 'uSamplerExchange1'), 
        uCellSpaceSize: gl.getUniformLocation(program_UpdateCellState, 'uCellSpaceSize'),
        uShiftState: gl.getUniformLocation(program_UpdateCellState, 'uShiftState'), 
        uOffSetReverseLookUp: gl.getUniformLocation(program_UpdateCellState, 'uOffSetReverseLookUp'), 
        uActionShift: gl.getUniformLocation(program_UpdateCellState, 'uActionShift'), 
        uComponentLookUp: gl.getUniformLocation(program_UpdateCellState, 'uComponentLookUp'), 
        uOffSetLookUp: gl.getUniformLocation(program_UpdateCellState, 'uOffSetLookUp'), 
       },
  };




  const programInfo_UpdateParticleInCell = 
  {
    program: program_UpdateParticleInCell,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_UpdateParticleInCell, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_UpdateParticleInCell, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_UpdateParticleInCell, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_UpdateParticleInCell, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_UpdateParticleInCell,'uflipY'),
        uSamplerParticleInCell: gl.getUniformLocation(program_UpdateParticleInCell, 'uSamplerParticleInCell'), 
        uSamplerExchange: gl.getUniformLocation(program_UpdateParticleInCell, 'uSamplerExchange'), 
        uCellSpaceSize: gl.getUniformLocation(program_UpdateParticleInCell, 'uCellSpaceSize'),
        uShiftState: gl.getUniformLocation(program_UpdateParticleInCell, 'uShiftState'), 
        uExShiftOffSet: gl.getUniformLocation(program_UpdateParticleInCell, 'uExShiftOffSet'), 
        uExLookUp: gl.getUniformLocation(program_UpdateParticleInCell, 'uExLookUp'), 
        uComponentLookUp: gl.getUniformLocation(program_UpdateParticleInCell, 'uComponentLookUp'), 
        uOffSetLookUp: gl.getUniformLocation(program_UpdateParticleInCell, 'uOffSetLookUp'), 
       },
  };

  const programInfo_ClearAction = 
  {
    program: program_ClearAction,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_ClearAction, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_ClearAction, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_ClearAction, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_ClearAction, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_ClearAction,'uflipY'),
       },
  };

  const programInfo_UpdateVelocity = 
  {
    program: program_UpdateVelocity,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_UpdateVelocity, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_UpdateVelocity, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_UpdateVelocity, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_UpdateVelocity, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_UpdateVelocity,'uflipY'),
        uSamplerPosition: gl.getUniformLocation(program_UpdateVelocity,'uSamplerPosition'),
        uSamplerVelocity: gl.getUniformLocation(program_UpdateVelocity,'uSamplerVelocity'),
        uMousePosition: gl.getUniformLocation(program_UpdateVelocity,'uMousePosition'),
        uForceConstant: gl.getUniformLocation(program_UpdateVelocity,'uForceConstant'),
        uInvNumOfParticles: gl.getUniformLocation(program_UpdateVelocity,'uInvNumOfParticles'),
        uDeltaTime: gl.getUniformLocation(program_UpdateVelocity,'uDeltaTime'),
       },
  };

  const programInfo_UpdateVelocityViaQuadAvg = 
  {
    program: program_UpdateVelocityViaQuadAvg,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_UpdateVelocityViaQuadAvg, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_UpdateVelocityViaQuadAvg, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_UpdateVelocityViaQuadAvg, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_UpdateVelocityViaQuadAvg, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_UpdateVelocityViaQuadAvg,'uflipY'),
        uSamplerPiC: gl.getUniformLocation(program_UpdateVelocityViaQuadAvg,'uSamplerPiC'),
        uSamplerAvgVelocity: gl.getUniformLocation(program_UpdateVelocityViaQuadAvg,'uSamplerAvgVelocity'),
        uSamplerVelocity: gl.getUniformLocation(program_UpdateVelocityViaQuadAvg,'uSamplerVelocity'),
        uExShiftOffSet: gl.getUniformLocation(program_UpdateVelocityViaQuadAvg,'uExShiftOffSet'),
        uInvNumOfParticles: gl.getUniformLocation(program_UpdateVelocityViaQuadAvg,'uInvNumOfParticles'),
        uTao: gl.getUniformLocation(program_UpdateVelocityViaQuadAvg,'uTao'),
       },
  };
  
  const programInfo_UpdateVelocityPiC = 
  {
    program: program_UpdateVelocityPiC,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_UpdateVelocityPiC, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_UpdateVelocityPiC, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_UpdateVelocityPiC, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_UpdateVelocityPiC, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_UpdateVelocityPiC,'uflipY'),
        uSamplerPosition: gl.getUniformLocation(program_UpdateVelocityPiC,'uSamplerPosition'),
        uSamplerVelocity: gl.getUniformLocation(program_UpdateVelocityPiC,'uSamplerVelocity'),
        uSamplerParticleInCell: gl.getUniformLocation(program_UpdateVelocityPiC,'uSamplerParticleInCell'),
        uForceConstant: gl.getUniformLocation(program_UpdateVelocityPiC,'uForceConstant'),
        uInvNumOfParticles: gl.getUniformLocation(program_UpdateVelocityPiC,'uInvNumOfParticles'),
        uDeltaTime: gl.getUniformLocation(program_UpdateVelocityPiC,'uDeltaTime'),
       },
  };


  const programInfo_StreamLBM = 
  {
    program: program_StreamLBM,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_StreamLBM, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_StreamLBM, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_StreamLBM, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_StreamLBM, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_StreamLBM,'uflipY'),
        uSamplerCellPosition: gl.getUniformLocation(program_StreamLBM, 'uSamplerCellPosition'), 
        uSamplerQuadData: gl.getUniformLocation(program_StreamLBM, 'uSamplerQuadData'), 
        uSamplerMomenta: gl.getUniformLocation(program_StreamLBM, 'uSamplerMomenta'), 
        uSamplerMomentaDelta: gl.getUniformLocation(program_StreamLBM, 'uSamplerMomentaDelta'),
        uShiftState: gl.getUniformLocation(program_StreamLBM, 'uShiftState'),
        uShiftOffSet: gl.getUniformLocation(program_StreamLBM, 'uShiftOffSet'),
        uCellSpaceSize: gl.getUniformLocation(program_StreamLBM, 'uCellSpaceSize'),
        uComponentLookUp: gl.getUniformLocation(program_StreamLBM, 'uComponentLookUp'), 
        uLookUp1: gl.getUniformLocation(program_StreamLBM, 'uLookUp1'), 
        uLookUp2: gl.getUniformLocation(program_StreamLBM, 'uLookUp2'), 
       },
  };

  const programInfo_ClearFloatTexture = 
  {
    program: program_ClearFloatTexture,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_ClearFloatTexture, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_ClearFloatTexture, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_ClearFloatTexture, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_ClearFloatTexture, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_ClearFloatTexture,'uflipY'),
       },
  };

  const programInfo_StreamLBMPart2 = 
  {
    program: program_StreamLBMPart2,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_StreamLBMPart2, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_StreamLBMPart2, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_StreamLBMPart2, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_StreamLBMPart2, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_StreamLBMPart2,'uflipY'),
        uSamplerMomenta: gl.getUniformLocation(program_StreamLBMPart2, 'uSamplerMomenta'), 
        uSamplerMomentaDelta: gl.getUniformLocation(program_StreamLBMPart2, 'uSamplerMomentaDelta'), 
       },
  };

    const programInfo_ConvertVelocityToMomenta = 
  {
    program: program_ConvertVelocityToMomenta,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_ConvertVelocityToMomenta, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_ConvertVelocityToMomenta, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_ConvertVelocityToMomenta, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_ConvertVelocityToMomenta, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_ConvertVelocityToMomenta,'uflipY'),
        uSamplerVelocity: gl.getUniformLocation(program_ConvertVelocityToMomenta, 'uSamplerVelocity'), 
        uInvNumOfParticles: gl.getUniformLocation(program_ConvertVelocityToMomenta, 'uInvNumOfParticles'), 
       },
  };

  const programInfo_ConvertMomentaToVelocity = 
  {
    program: program_ConvertMomentaToVelocity,
      attribLocations: 
      {
        vertexAction: gl.getAttribLocation(program_ConvertMomentaToVelocity, 'aVertexAction'),
        textureCoord: gl.getAttribLocation(program_ConvertMomentaToVelocity, 'aTextureCoord'),
      },
      uniformLocations: 
      {
        projectionMatrix: gl.getUniformLocation(program_ConvertMomentaToVelocity, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program_ConvertMomentaToVelocity, 'uModelViewMatrix'),
        uflipY: gl.getUniformLocation(program_ConvertMomentaToVelocity,'uflipY'),
        uSamplerMomenta: gl.getUniformLocation(program_ConvertMomentaToVelocity, 'uSamplerMomenta'),
        uInvNumOfParticles: gl.getUniformLocation(program_ConvertMomentaToVelocity, 'uInvNumOfParticles'), 
        
       },
  };



  

  // Make rectangle for displaying stuff
  const buffers = initBuffers(gl);
  const dotbuffers = initDotBuffers(gl,dotsides)

  
  

  

 
  //make a particle

  // create particle space
  var pos_str = "";
  var vel_str = "";
  var col_str = "";
  var initial_cell_data = new Int32Array(nCellsX*nCellsY*4);
  var initial_color_data = new Float32Array(nParticles*4);
  var initial_position_data = new Float32Array(nParticles*4);
  var initial_pic_data = new Float32Array(nParticles*4);
  var initial_velocity_data = new Float32Array(nParticles*4);
  var initial_momenta_data = new Float32Array(nParticles*4);

  for (let jj = 1; jj < nParticles; ++jj)
  {
    let index = jj*4;
    let place_not_found = true;

    while (place_not_found)
    {
      let x_r = 0.8*Math.random()+0.1;
      let y_r = 0.8*Math.random()+0.1; 

      //let x_r = 0.66600;
      //let y_r = 0.9495; 
      let ix = Math.floor(x_r*nCellsX);
      let iy = Math.floor(y_r*nCellsY);
      let cIndex = 4*(ix + iy*nCellsX);

      if (initial_cell_data[cIndex] == 0)
      {
        initial_cell_data[cIndex] = jj;
        // Positions b/w 0 and 1, velocity b/w -0.5 and 0.5
        initial_position_data[index] = x_r;
        initial_pic_data[index] = (Math.floor(x_r*nCellsX) + 0.5)/nCellsX;
        initial_velocity_data[index] = (Math.random() - 0.5);
       //initial_velocity_data[index] = 0.4;
        initial_color_data[index] = Math.random();
        initial_position_data[index + 1] = y_r;
        initial_pic_data[index+ 1] = (Math.floor(y_r*nCellsY) + 0.5)/nCellsY;
        initial_velocity_data[index + 1] = Math.random() - 0.5;
       //initial_velocity_data[index + 1] = 0.47;
        initial_color_data[index + 1] = Math.random();
        initial_color_data[index + 2] = Math.random();
        initial_color_data[index + 3] = 1.0;

        if(initial_velocity_data[index + 1] >= 0)
          initial_momenta_data[index] = initial_velocity_data[index+1];
        else
          initial_momenta_data[index+2] = -initial_velocity_data[index+1];

        if(initial_velocity_data[index] >= 0)
          initial_momenta_data[index+1] = initial_velocity_data[index];
        else
          initial_momenta_data[index+3] = -initial_velocity_data[index];


       

        place_not_found = false;
        /*pos_str += x_r.toString()+", "+y_r.toString()+", 0, 0, ";
        vel_str +=initial_velocity_data[index].toString()+", "+initial_velocity_data[index + 1].toString()+", 0, 0, ";
        col_str += initial_color_data[index + 0]+", ";
        col_str += initial_color_data[index + 1]+", ";
        col_str += initial_color_data[index + 2]+", ";
        col_str += initial_color_data[index + 3]+", "; */

      }
    } 
  }




  var colortex = createAndSetupTexture(gl);
  initializeParticleTexture(gl, colortex, initial_color_data);
 

/* console.log(pos_str);
console.log(vel_str); */
 
  var ptex = [];
  var pfbo = [];
  for(let ii = 0; ii < 2; ++ii)
  {
    let tex = createAndSetupTexture(gl);
    initializeParticleTexture(gl, tex, initial_position_data);
    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    ptex.push(tex);
    pfbo.push(fbo);
  }

  var pictex = [];
  var picfbo = [];
  for(let ii = 0; ii < 2; ++ii)
  {
    let tex = createAndSetupTexture(gl);
    initializeParticleTexture(gl, tex, initial_pic_data);
    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    pictex.push(tex);
    picfbo.push(fbo);
  }

  var vtex = [];
  var vfbo = [];
  for(let ii = 0; ii < 2; ++ii)
  {
    let tex = createAndSetupTexture(gl);
    initializeParticleTexture(gl, tex, initial_velocity_data);
    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    vtex.push(tex);
    vfbo.push(fbo);
  }

  var atex = [];
  var afbo = [];
  for(let ii = 0; ii < 2; ++ii)
  {
    let tex = createAndSetupTexture(gl);
    initializeParticleTexture(gl, tex, null);
    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    atex.push(tex);
    afbo.push(fbo);
  }

  var stex = [];
  var sfbo = [];
  for(let ii = 0; ii < 2; ++ii)
  {
    let tex = createAndSetupTexture(gl);
    initializeActionTexture(gl, tex, null);
    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    stex.push(tex);
    sfbo.push(fbo);
  }

  var mtex = [];
  var mfbo = [];
  for(let ii = 0; ii < 2; ++ii)
  {
    let tex = createAndSetupTexture(gl);
    initializeParticleTexture(gl, tex, null);
    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    mtex.push(tex);
    mfbo.push(fbo);
  }

  var mtexdelta = [];
  var mfbodelta = [];
  for(let ii = 0; ii < 2; ++ii)
  {
    let tex = createAndSetupTexture(gl);
    initializeParticleTexture(gl, tex, null);
    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    mtexdelta.push(tex);
    mfbodelta.push(fbo);
  }


  
  let InitialArray = [];
  InitializeSwitchTable(4, InitialArray);
  var switchtex = createAndSetupTexture(gl);
  initializeSwitchTexture(gl, switchtex, switchTable);





  // create cellular space with particle data
  var ctex = [];
  var cfbo = [];

  for(let ii = 0; ii < 2; ++ii)
  {
    let tex = createAndSetupTexture(gl);
    initializeCellTexture(gl, tex, initial_cell_data);
    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    ctex.push(tex);
    cfbo.push(fbo);
  }

  var etex = [];
  var efbo = [];

  for(let ii = 0; ii < 1; ++ii)
  {
    let tex = createAndSetupTexture(gl);
    initializeExchangeTexture(gl, tex, null);
    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    etex.push(tex);
    efbo.push(fbo);
  }

  var quadAvgVeltex = [];
  var quadAvgVelfbo = [];

  for(let ii = 0; ii < 1; ++ii)
  {
    let tex = createAndSetupTexture(gl);
    initializeQuadFloatTexture(gl, tex, null);
    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    quadAvgVeltex.push(tex);
    quadAvgVelfbo.push(fbo);
  }

  var pLast = 0;
  var pNext = 1;
  var vLast = 0;
  var vNext = 1;
  var sLast = 0;
  var sNext = 1;
  var cLast = 0;
  var cNext = 1;
  var picLast = 0;
  var picNext = 1;
  var mLast = 0;
  var mNext = 1;
  var mLastDelta = 0;
  var mNextDelta = 1;
  var eShift_state = 3;
  var shift_index  = 0;
  
   var then = 0;
  var picData = new Float32Array(nParticles*4);
  let pData = new Float32Array(nParticles*4);
 
   function update(now) {
     now *= 0.001;  // convert to seconds
     const deltaTime = now - then;
     then = now;
     let dt = 0.05;

     RunUpdatePosition(gl, programInfo_UpdatePosition, buffers, ptex[pLast], vtex[vLast], ctex[cLast], pfbo[pNext], dt);
     pLast = pNext;
     pNext = (pLast+1) % 2;
     
     gl.readPixels(0, 0, nParticles, 1.0, gl.RGBA, gl.FLOAT, pData);
   

     RunUpdateAction(gl, programInfo_UpdateAction, buffers, ptex[pLast], ptex[pNext], stex[sLast], sfbo[sNext]);
     sLast = sNext;
     sNext = (sLast+1) % 2;

    //let sData = new Int32Array(nParticles*4);
    //gl.readPixels(0, 0, nParticles, 1.0, gl.RGBA_INTEGER, gl.INT, sData);

     RunUpdateVelocity(gl, programInfo_UpdateVelocity, buffers, pictex[picLast], vtex[vLast], vfbo[vNext],dt);
     //RunUpdateVelocity(gl, programInfo_UpdateVelocity, buffers, ptex[pLast], vtex[vLast], vfbo[vNext],0.01);
     vLast = vNext;
     vNext = (vLast+1) % 2;
     //let vData = new Float32Array(nParticles*4);
     //gl.readPixels(0, 0, nParticles, 1.0, gl.RGBA, gl.FLOAT, vData); 

    
     
     



    // gl.readPixels(0, 0, nParticles, 1.0, gl.RGBA, gl.FLOAT, vData);
    

     RunUpdateCellAction(gl, programInfo_UpdateCellAction, buffers, ctex[cLast], stex[sLast], cfbo[cNext]);
     cLast = cNext;
     cNext = (cLast+1)%2;


/*      let cData = new Int32Array(nCellsX*nCellsY*4);
     gl.readPixels(0, 0, nCellsX, nCellsY, gl.RGBA_INTEGER, gl.INT, cData); */

     RunClearAction(gl, programInfo_ClearAction, buffers, sfbo[sLast]);
  



    


    
     
 
     
/*      if (eShift_state == 3)
     {
      eShift_state = (eShift_state + 1) % 4;
     } */
     //console.log(eShift_state);


      let eIndex = eShift_state*2;
      RunExchange(gl, programInfo_Exchange, buffers, ctex[cLast], switchtex, efbo[0], eShift[eIndex],eShift[eIndex + 1] );
     
       //let eData = new Int32Array(nCellsX*nCellsY);
      //gl.readPixels(0, 0, nCellsX/2, nCellsY/2, gl.RGBA_INTEGER, gl.INT, eData);
  

 
      RunUpdateCellState(gl, programInfo_UpdateCellState, buffers, ctex[cLast], etex[0], cfbo[cNext], eShift_state, -eShift[eIndex], -eShift[eIndex + 1]);
       cLast = cNext;
      cNext = (cLast+1)%2;
      //gl.readPixels(0, 0, nCellsX, nCellsY, gl.RGBA_INTEGER, gl.INT, cData); 

 /*     let count = 0;
      for(let ii =0; ii < nCellsX; ++ii)
      {
        for (let jj =0; jj < nCellsY; ++jj)
        {
          count += Math.sign(cData[4*(nCellsX*jj + ii)]);

        }
      }

      if (count != nParticles - 1)
      {
        console.log('Mismatch! Cell particles: '+count+' Actual particles:' +(nParticles - 1));
      } */

     RunUpdateParticleInCell(gl, programInfo_UpdateParticleInCell, buffers, pictex[picLast], etex[0], picfbo[picNext], eShift_state,-eShift[eIndex], -eShift[eIndex + 1]);
     picLast = picNext;
     picNext = (picLast + 1)%2;
     gl.readPixels(0, 0, nParticles, 1.0, gl.RGBA, gl.FLOAT, picData);

     RunUpdatePositionWithParticleInCell(gl, programInfo_UpdatePositionWithParticleInCell, buffers, ptex[pLast], pictex[picLast], pfbo[pNext]) ;
     pLast = pNext;
     pNext = (pLast + 1)%2;
     //gl.readPixels(0, 0, nParticles, 1.0, gl.RGBA, gl.FLOAT, pData);

    
    
       RunConvertVelocityToMomenta(gl, programInfo_ConvertVelocityToMomenta, buffers, vtex[vLast], mfbo[mLast]);
     
     //clear momenta Last Delta
     RunClearFloatTexture(gl, programInfo_ClearFloatTexture, buffers, mfbodelta[mLastDelta], nParticles, 1.0);

     for(let iii = 0; iii < 4; ++iii)
     {
   
       
       let eIndex2 = iii*2;
     RunQuadCompress(gl, programInfo_QuadCompress, buffers, ctex[cLast], efbo[0], eShift[eIndex2], eShift[eIndex2 + 1] );
    //let quadcompData = new Int32Array(nCellsX*nCellsY);
    //gl.readPixels(0, 0, nCellsX/2, nCellsY/2, gl.RGBA_INTEGER, gl.INT, quadcompData); 

    

     RunStreamLBM(gl, programInfo_StreamLBM, buffers, pictex[picLast], etex[0], mtex[mLast], mtexdelta[mLastDelta],mfbodelta[mNextDelta], iii, -eShift[eIndex2], -eShift[eIndex2 + 1]) ;
     mLastDelta = mNextDelta;
     mNextDelta = (mLastDelta+1) % 2;
      //let mData = new Float32Array(nParticles*4);
     //gl.readPixels(0, 0, nParticles, 1.0, gl.RGBA, gl.FLOAT, mData); 
     }

     RunStreamLBMPart2(gl, programInfo_StreamLBMPart2, buffers, mtex[mLast], mtexdelta[mLastDelta], mfbo[mNext]);
     mLast = mNext;
     mNext = (mLast+1) % 2;

     RunConvertMomentaToVelocity(gl, programInfo_ConvertMomentaToVelocity, buffers, mtex[mLast], vfbo[vNext]);
     vLast = vNext;
     vNext = (vLast+1) % 2;   
     
     
     render(gl, programInfo_Render, buffers, ctex[cLast]); 

      
      PrepRenderDotsContext(gl, programInfo_RenderDot, dotbuffers);
      RunRenderDots(gl, programInfo_RenderDot,1,1,1,1, [4*(mousePx-0.5),-2*(mousePy-0.5), -3], dotsides)
         
/*        for (let jj = 1; jj < nParticles; ++jj)
      {
       let pIndex = jj*4;
       let r =  initial_color_data[pIndex];
       let g =  initial_color_data[pIndex + 1];
       let b =  initial_color_data[pIndex + 2];
       let a =  initial_color_data[pIndex + 3];
       
       RunRenderDots(gl, programInfo_RenderDot,r,g,b,1, [4*(pData[pIndex]-0.5),-2*(pData[pIndex+1]-0.5), -3], dotsides); 
       RunRenderDots(gl, programInfo_RenderDot,r,g,b,1, [4*(picData[pIndex]-0.5),-2*(picData[pIndex+1]-0.5), -3], dotsides); 
      } */     
      
      shift_index = (shift_index + 1) % shift_total;
      eShift_state  = shift_sequence[shift_index];
      //console.log(eShift_state);

     requestAnimationFrame(update);
   }
   requestAnimationFrame(update);
}





function render(gl, programInfo, buffers, renderTex) {
  //clean up frame
  setFramebuffer(gl, null, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create a perspective matrix
  const fieldOfView = 45 * Math.PI / 180;   // in radians
  const aspect = 1;//gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.0;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix,
    fieldOfView,
    aspect,
    zNear,
    zFar);


  // Set the drawing position to identity point
  const modelViewMatrix = mat4.create();

  mat4.translate(modelViewMatrix,     // destination matrix
    modelViewMatrix,     // matrix to translate
    [0.0, 0.0, -3]);  // amount to translate
  mat4.rotate(modelViewMatrix,  // destination matrix
    modelViewMatrix,  // matrix to rotate
    0,     // amount to rotate in radians
    [1, 0, 0]);       // axis to rotate around (Z)
  mat4.rotate(modelViewMatrix,  // destination matrix
    modelViewMatrix,  // matrix to rotate
    0,// amount to rotate in radians
    [0, 0, 1]);       // axis to rotate around (X)


  // Tell WebGL how to pull out vertex data
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      3, //number of components
      gl.FLOAT, //data type
      false, //normalize - don't
      0, //stride
      0); // offset
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  


  // Tell WebGL how to pull texcoords
  
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
  gl.vertexAttribPointer(
      programInfo.attribLocations.textureCoord,
      2, //numComponents,
      gl.FLOAT, //type,
      false, //normalize,
      0, //stride,
      0); //offset);
  gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
  

  // Tell WebGL which indices to use to index the vertices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  // Set the shader uniforms
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix);

  
  // Specify the texture to map onto the faces.
  // Tell WebGL we want to affect texture unit 0
 

  

  // Tell the shader we bound the texture to texture unit 0
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, renderTex); 

 gl.uniform1f(programInfo.uniformLocations.uflipY, 1);


   // draw to canvas
   setFramebuffer(gl, null, gl.canvas.width, gl.canvas.height);
   gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  
}

function PrepRenderDotsContext(gl, programInfo, buffers)
{
  //clean up frame
/*   setFramebuffer(gl, null, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); */

  // Create a perspective matrix
  const fieldOfView = 45 * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.0;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix,fieldOfView,aspect, zNear,zFar);

  // Tell WebGL how to pull out vertex data
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      3, //number of components
      gl.FLOAT, //data type
      false, //normalize - don't
      0, //stride
      0); // offset
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  




  // Tell WebGL which indices to use to index the vertices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  // Set the shader uniforms
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
 

 gl.uniform1f(programInfo.uniformLocations.uflipY, 1);
 


   // draw to canvas
   setFramebuffer(gl, null, gl.canvas.width, gl.canvas.height);
   
  
}

function RunRenderDots(gl, programInfo, r,g,b,a, position, dotsides) 
{
   // Set the drawing position to identity point
   const modelViewMatrix = mat4.create();

   mat4.translate(modelViewMatrix, modelViewMatrix, position); 
   mat4.scale(modelViewMatrix,modelViewMatrix,[0.03,0.03,0.03]) ;

   gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix);

  gl.uniform4f(programInfo.uniformLocations.uDotColor, r,g,b,a);
  gl.drawElements(gl.TRIANGLES, 3*dotsides, gl.UNSIGNED_SHORT, 0);
  
  
}

function RunUpdatePosition(gl, programInfo, buffers, ptex, vtex, ctex, pfbo, deltaTime) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
  gl.uniform1i(programInfo.uniformLocations.uNumOfParticles, nParticles);
  gl.uniform1f(programInfo.uniformLocations.uDeltaTime, deltaTime);
  gl.uniform1i(programInfo.uniformLocations.uSamplerPosition, 0);
  gl.uniform1i(programInfo.uniformLocations.uSamplerVelocity, 1);
  gl.uniform1i(programInfo.uniformLocations.uSamplerCell, 2);
  
  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ptex); 
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, vtex); 
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, ctex); 
   
  // Set Framebuffer
  setFramebuffer(gl, pfbo, nParticles, 1);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}


function RunUpdatePositionWithParticleInCell(gl, programInfo, buffers, ptex, pictex, pfbo) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
  gl.uniform2f(programInfo.uniformLocations.uCellSpaceSize, nCellsX,nCellsY);
  gl.uniform2f(programInfo.uniformLocations.uInvCellSpaceSize, 1/nCellsX, 1/nCellsY);
  gl.uniform1f(programInfo.uniformLocations.uInvNumOfParticles, 1/nParticles);
  

  
  // Bind textures in same order as above
  gl.uniform1i(programInfo.uniformLocations.uSamplerPosition, 0);
  gl.uniform1i(programInfo.uniformLocations.uSamplerParticleInCell, 1);
  
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ptex); 
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, pictex); 
   
  // Set Framebuffer
  setFramebuffer(gl, pfbo, nParticles, 1);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}

function RunUpdateVelocity(gl, programInfo, buffers, ptex, vtex, vfbo, deltaTime) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
  gl.uniform1f(programInfo.uniformLocations.uDeltaTime, deltaTime);
  gl.uniform1f(programInfo.uniformLocations.uForceConstant, input);
  gl.uniform1f(programInfo.uniformLocations.uInvNumOfParticles, 1/nParticles);
  gl.uniform2f(programInfo.uniformLocations.uMousePosition, mousePx, mousePy);
  
 
  gl.uniform1i(programInfo.uniformLocations.uSamplerPosition, 0);
  gl.uniform1i(programInfo.uniformLocations.uSamplerVelocity, 1);
  
  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ptex); 
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, vtex); 
   
  // Set Framebuffer
  setFramebuffer(gl, vfbo, nParticles, 1);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}

function RunUpdateVelocityViaQuadAvg(gl, programInfo, buffers, pictex, quadtex, vtex,  vfbo, shiftX, shiftY) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
  gl.uniform1f(programInfo.uniformLocations.uTao, 0);
  gl.uniform2f(programInfo.uniformLocations.uExShiftOffSet, shiftX/nCellsX, shiftY/nCellsY);
  gl.uniform1f(programInfo.uniformLocations.uInvNumOfParticles, 1/nParticles);

  
  gl.uniform1i(programInfo.uniformLocations.uSamplerPiC, 0);
  gl.uniform1i(programInfo.uniformLocations.uSamplerAvgVelocity, 1);
  gl.uniform1i(programInfo.uniformLocations.uSamplerVelocity, 2);
  
  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, pictex); 
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, quadtex); 
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, vtex); 
   
  // Set Framebuffer
  setFramebuffer(gl, vfbo, nParticles, 1);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}

function RunUpdateVelocityPiC(gl, programInfo, buffers, ptex, vtex, pictex, vfbo, deltaTime) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
  gl.uniform1f(programInfo.uniformLocations.uDeltaTime, deltaTime);
  gl.uniform1f(programInfo.uniformLocations.uForceConstant, input);
  gl.uniform1f(programInfo.uniformLocations.uInvNumOfParticles, 1/nParticles);

  
  gl.uniform1i(programInfo.uniformLocations.uSamplerPosition, 0);
  gl.uniform1i(programInfo.uniformLocations.uSamplerVelocity, 1);
  gl.uniform1i(programInfo.uniformLocations.uSamplerParticleInCell, 2);
  
  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ptex); 
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, vtex); 
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, pictex);
   
  // Set Framebuffer
  setFramebuffer(gl, vfbo, nParticles, 1);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}

function RunWrapPosition(gl, programInfo, buffers, ptex, pfbo) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
  gl.uniform1i(programInfo.uniformLocations.uSamplerPosition, 0);
  
  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ptex); 
   
  // Set Framebuffer
  setFramebuffer(gl, pfbo, nParticles, 1);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}

function RunUpdateAction(gl, programInfo, buffers, ptex0, ptex1, stex2, sfbo) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
  gl.uniform4f(programInfo.uniformLocations.uCellSpaceSize, nCellsX, nCellsY, 0, 0);
  gl.uniform1i(programInfo.uniformLocations.uSamplerPosition0, 0);
  gl.uniform1i(programInfo.uniformLocations.uSamplerPosition1, 1);
  gl.uniform1i(programInfo.uniformLocations.uSamplerAction2, 2);

  
  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ptex0); 
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, ptex1); 
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, stex2); 
   
  // Set Framebuffer
  setFramebuffer(gl, sfbo, nParticles, 1);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}

function RunUpdateCellAction(gl, programInfo, buffers, ctex0, stex1, cfbo) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
  gl.uniform1f(programInfo.uniformLocations.uParticlesInv, 1/nParticles);
  gl.uniform1i(programInfo.uniformLocations.uSamplerCell0, 0);
  gl.uniform1i(programInfo.uniformLocations.uSamplerAction1, 1);

  
  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ctex0); 
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, stex1); 

   
  // Set Framebuffer
  setFramebuffer(gl, cfbo, nCellsX, nCellsY);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}

function RunExchange(gl, programInfo, buffers, ctex0, switchtex1, efbo , shiftX, shiftY) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);

  let shiftOffSet = [(shiftX + -0.5)/nCellsX, (shiftY + -0.5)/nCellsY,
                 (shiftX + 0.5)/nCellsX, (shiftY + -0.5)/nCellsY,
                 (shiftX + -0.5)/nCellsX, (shiftY + 0.5)/nCellsY,
                 (shiftX + 0.5)/nCellsX, (shiftY + 0.5)/nCellsY];

  gl.uniform2fv(programInfo.uniformLocations.uOffSet, shiftOffSet);
  //gl.uniform2f(programInfo.uniformLocations.uOffSetc2, (shiftX + 0.5)/nCellsX, (shiftY + -0.5)/nCellsY );
  //gl.uniform2f(programInfo.uniformLocations.uOffSetc3, (shiftX + -0.5)/nCellsX, (shiftY + 0.5)/nCellsY );
  //gl.uniform2f(programInfo.uniformLocations.uOffSetc4, (shiftX + 0.5)/nCellsX, (shiftY + 0.5)/nCellsY  );


  gl.uniform1i(programInfo.uniformLocations.uSamplerCell0, 0);
  gl.uniform1i(programInfo.uniformLocations.uSamplerSwitch1, 1);
  

  
  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ctex0); 
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, switchtex1); 


   
  // Set Framebuffer
  setFramebuffer(gl, efbo, nCellsX/2, nCellsY/2);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}

function RunClearFloatTexture(gl, programInfo, buffers, fbo, width, height) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
  // Set Framebuffer
  setFramebuffer(gl, fbo, width, height);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}


function RunQuadAvgVelocity(gl, programInfo, buffers, ctex, vtex, quadfbo, shiftX, shiftY) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);

  let shiftOffSet = [(shiftX + -0.5)/nCellsX, (shiftY + -0.5)/nCellsY,
    (shiftX + 0.5)/nCellsX, (shiftY + -0.5)/nCellsY,
    (shiftX + -0.5)/nCellsX, (shiftY + 0.5)/nCellsY,
    (shiftX + 0.5)/nCellsX, (shiftY + 0.5)/nCellsY];

  gl.uniform2fv(programInfo.uniformLocations.uOffSet, shiftOffSet);

  gl.uniform1i(programInfo.uniformLocations.uSamplerCell, 0);
  gl.uniform1i(programInfo.uniformLocations.uSamplerVelocity, 1);
  

  
  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ctex); 
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, vtex); 


   
  // Set Framebuffer
  setFramebuffer(gl, quadfbo, nCellsX/2, nCellsY/2);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}

function RunQuadCompress(gl, programInfo, buffers, ctex0, quadfbo, shiftX, shiftY) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);

  gl.uniform2f(programInfo.uniformLocations.uOffSetc1, (shiftX + -0.5)/nCellsX, (shiftY + -0.5)/nCellsY);
  gl.uniform2f(programInfo.uniformLocations.uOffSetc2, (shiftX + 0.5)/nCellsX, (shiftY + -0.5)/nCellsY );
  gl.uniform2f(programInfo.uniformLocations.uOffSetc3, (shiftX + -0.5)/nCellsX, (shiftY + 0.5)/nCellsY );
  gl.uniform2f(programInfo.uniformLocations.uOffSetc4, (shiftX + 0.5)/nCellsX, (shiftY + 0.5)/nCellsY  );


  gl.uniform1i(programInfo.uniformLocations.uSamplerCell0, 0);
  
  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ctex0); 
   
  // Set Framebuffer
  setFramebuffer(gl, quadfbo, nCellsX/2, nCellsY/2);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function RunUpdateCellState(gl, programInfo, buffers, ctex0, etex1, cfbo, eShiftState, shiftX, shiftY) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);

  //gl.uniform4fv(programInfo.uniformLocations.uExLookUp, null);
  gl.uniform1iv(programInfo.uniformLocations.uComponentLookUp, componentLookUp );
  gl.uniform2fv(programInfo.uniformLocations.uOffSetLookUp, offSetLookUp );
  gl.uniform3iv(programInfo.uniformLocations.uActionShift, actionShift );
  gl.uniform2f(programInfo.uniformLocations.uCellSpaceSize, nCellsX, nCellsY);
  gl.uniform2fv(programInfo.uniformLocations.uOffSetReverseLookUp, offSetReverseLookUp);
  gl.uniform1i(programInfo.uniformLocations.uShiftState, eShiftState);

  gl.uniform1i(programInfo.uniformLocations.uSamplerCell0, 0);
  gl.uniform1i(programInfo.uniformLocations.uSamplerExchange1, 1);
  
  
  
  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ctex0); 
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, etex1); 

   
  // Set Framebuffer
  setFramebuffer(gl, cfbo, nCellsX, nCellsY);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}




function RunStreamLBM(gl, programInfo, buffers, pictex, quadtex, mtex, mtexdelta, mfbodelta, eShiftState, shiftX, shiftY) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);

  gl.uniform1i(programInfo.uniformLocations.uShiftState, eShiftState);
  gl.uniform2f(programInfo.uniformLocations.uShiftOffSet, shiftX/nCellsX, shiftY/nCellsY);
  gl.uniform2f(programInfo.uniformLocations.uCellSpaceSize, nCellsX, nCellsY);
  gl.uniform1iv(programInfo.uniformLocations.uComponentLookUp, componentLookUp );
  gl.uniform3iv(programInfo.uniformLocations.uLookUp1, streamLookUp1 );
  gl.uniform4iv(programInfo.uniformLocations.uLookUp2, streamLookUp2 );

  
  
  // Set sampler uniforms
  gl.uniform1i(programInfo.uniformLocations.uSamplerCellPosition, 0);
  gl.uniform1i(programInfo.uniformLocations.uSamplerQuadData, 1);
  gl.uniform1i(programInfo.uniformLocations.uSamplerMomenta, 2);
  gl.uniform1i(programInfo.uniformLocations.uSamplerMomentaDelta, 3);
  
  
  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, pictex); 
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, quadtex); 
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, mtex);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, mtexdelta); 

   
  // Set Framebuffer
  setFramebuffer(gl, mfbodelta, nParticles, 1.0);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}

function RunStreamLBMPart2(gl, programInfo, buffers, mtex, mtexdelta, mfbo) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
  
  // Set sampler uniforms
  gl.uniform1i(programInfo.uniformLocations.uSamplerMomenta, 0);
  gl.uniform1i(programInfo.uniformLocations.uSamplerMomentaDelta, 1);
  
  
  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, mtex);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, mtexdelta); 

   
  // Set Framebuffer
  setFramebuffer(gl, mfbo, nParticles, 1.0);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}

function RunConvertVelocityToMomenta(gl, programInfo, buffers, vtex, mfbo) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
  gl.uniform1f(programInfo.uniformLocations.uInvNumOfParticles, 1/nParticles);

  // Set sampler uniforms
  gl.uniform1i(programInfo.uniformLocations.uSamplerVelocity, 0);

  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, vtex); 

  // Set Framebuffer
  setFramebuffer(gl, mfbo, nParticles, 1.0);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}

function RunConvertMomentaToVelocity(gl, programInfo, buffers, mtex, vfbo) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
  gl.uniform1f(programInfo.uniformLocations.uInvNumOfParticles, 1/nParticles);

  // Set sampler uniforms
  gl.uniform1i(programInfo.uniformLocations.uSamplerMomenta, 0);

  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, mtex); 

  // Set Framebuffer
  setFramebuffer(gl, vfbo, nParticles, 1.0);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}



function RunUpdateParticleInCell(gl, programInfo, buffers, pictex, etex, picfbo, eShiftstate, shiftX, shiftY) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);

  //gl.uniform4fv(programInfo.uniformLocations.uExLookUp, null);
  gl.uniform1iv(programInfo.uniformLocations.uComponentLookUp, componentLookUp );
  gl.uniform2fv(programInfo.uniformLocations.uOffSetLookUp, offSetLookUp );

  gl.uniform2f(programInfo.uniformLocations.uCellSpaceSize, nCellsX, nCellsY);
  gl.uniform2f(programInfo.uniformLocations.uExShiftOffSet, shiftX/nCellsX, shiftY/nCellsY);
  gl.uniform1i(programInfo.uniformLocations.uShiftState, eShiftstate);

  gl.uniform1i(programInfo.uniformLocations.uSamplerParticleInCell, 0);
  gl.uniform1i(programInfo.uniformLocations.uSamplerExchange, 1);
  
  
  
  // Bind textures in same order as above
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, pictex); 
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, etex); 

   
  // Set Framebuffer
  setFramebuffer(gl, picfbo, nParticles, 1.0);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}


function RunClearAction(gl, programInfo, buffers, sfbo) 
{
  setupContext(gl, programInfo, buffers);
  
  // Set Uniforms
  gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
   
  // Set Framebuffer
  setFramebuffer(gl, sfbo, nParticles, 1.0);

  // do drawing to frame buffer 
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
 
}


function setupContext(gl, programInfo, buffers)
{
  const projectionMatrix = mat4.create();

  // Set the drawing position to identity point
  const modelViewMatrix = mat4.create();

  // move the drawing position
  mat4.translate(modelViewMatrix,     // destination matrix
                 modelViewMatrix,     // matrix to translate
                 [0.0, 0.0, 0.0]);  // amount to translate

  // Tell WebGL how to pull out vertex data
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      3, //number of components
      gl.FLOAT, //data type
      false, //normalize - don't
      0, //stride
      0); // offset
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  


  // Tell WebGL how to pull texcoords
  
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
  gl.vertexAttribPointer(
      programInfo.attribLocations.textureCoord,
      2, //numComponents,
      gl.FLOAT, //type,
      false, //normalize,
      0, //stride,
      0); //offset);
  gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
  

  // Tell WebGL which indices to use to index the vertices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  // Set the shader uniforms
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix);

}


function setFramebuffer(gl, fbo, width, height) 
{
  // make this the framebuffer we are rendering to.
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

  // Tell the shader the resolution of the framebuffer.
 // gl.uniform2f(resolutionLocation, width, height);

  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, width, height);
}

// initBuffers
function initBuffers(gl) {

  // Create a buffer for the cube's vertex positions.
  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Create rectangle for displaying textures
  const positions = [
    -1.0, -1.0,  0.0,
     1.0, -1.0,  0.0,
     1.0,  1.0,  0.0,
    -1.0,  1.0,  0.0,

  ];

  // Pass positions to vertex buffer
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Set up texture coordinates buffer for vertices
  const textureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
 // create texcoord data
  const textureCoordinates = [
    // Front
    0.0,  1.0,
    1.0,  1.0,
    1.0,  0.0,
    0.0,  0.0,
  ];

  // Pass texcoord data to textureCoordbuffer
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                gl.STATIC_DRAW);

  // Setup Index Buffer
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // Create index data
  const indices = [
    0,  1,  2,      0,  2,  3,    // front
  ];

  // Pass index data to index buffer
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices), gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    textureCoord: textureCoordBuffer,
    indices: indexBuffer,
  };
}

function initDotBuffers(gl,sides) {

  // Create a buffer for the dot's position
  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Create rectangle for displaying textures
  let positions = [0.0, 0.0,  0.0,];
    
  
  for(let ii = 0; ii < sides; ++ii)
  {
    let angle = (ii/sides)*2*Math.PI;
    positions.push(Math.cos(angle));
    positions.push(Math.sin(angle));
    positions.push(0.0);
  }

  // Pass positions to vertex buffer
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Set up texture coordinates buffer for vertices
  const textureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
 


  // Setup Index Buffer
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // Create index data
  let indices = [];
  for (let ii = 0; ii < sides-1; ++ii)
  {
    indices.push(0);
    indices.push(ii + 1);
    indices.push(ii + 2);
  }
  indices.push(0);
  indices.push(sides);
  indices.push(1);
  

  // Pass index data to index buffer
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices), gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    indices: indexBuffer,
  };
}



function createAndSetupTexture(gl)
{
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
}

function createAndSetupTextureLinear(gl)
{
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
}

function initializeCellTexture(gl, texture, data)
{ const level = 0;
  const internalFormat = gl.RGBA32I;
  const width = nCellsX;
  const height = nCellsY;
  const border = 0;
  const srcFormat = gl.RGBA_INTEGER;
  const srcType = gl.INT;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                data);
}

function initializeSwitchTexture(gl, texture, data)
{ const level = 0;
  const internalFormat = gl.RGBA32I;
  const width = 100;
  const height = 100;
  const border = 0;
  const srcFormat = gl.RGBA_INTEGER;
  const srcType = gl.INT;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                data);
}

function initializeExchangeTexture(gl, texture, data)
{ const level = 0;
  const internalFormat = gl.RGBA32I;
  if (nCellsX % 2 != 0 || nCellsY %2 != 0 )
  {
    alert('Cell dimensions are not even, cannot properly initialize Exchange Texture');
  }
  const width = nCellsX/2;
  const height = nCellsY/2;
  const border = 0;
  const srcFormat = gl.RGBA_INTEGER;
  const srcType = gl.INT;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                data);
}

function initializeQuadFloatTexture(gl, texture, data)
{ const level = 0;
  const internalFormat = gl.RGBA32F;
  if (nCellsX % 2 != 0 || nCellsY %2 != 0 )
  {
    alert('Cell dimensions are not even, cannot properly initialize Exchange Texture');
  }
  const width = nCellsX/2;
  const height = nCellsY/2;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.FLOAT;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                data);
}

function initializeParticleTexture(gl, texture, data)
{ const level = 0;
  const internalFormat = gl.RGBA32F;
  const width = nParticles;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.FLOAT;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                data);
}

function initializeActionTexture(gl, texture, data)
{ const level = 0;
  const internalFormat = gl.RGBA32I;
  const width = nParticles;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA_INTEGER;
  const srcType = gl.INT;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                data);
}

function initializeTexture(gl, texture, data)
{ const level = 0;
  const internalFormat = gl.RGBA32UI;
  const width = nCellsX;
  const height = nCellsY;
  const border = 0;
  const srcFormat = gl.RGBA_INTEGER;
  const srcType = gl.UNSIGNED_INT;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                data);
}

function initializeTextureRGBA(gl, texture)
{ const level = 0;
  const internalFormat = gl.RGBA;
  const width = nCellsX;
  const height = nCellsY;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                null);
}

function initializeTextureWithImage(gl, texture, image)
{ const level = 0;
  const internalFormat = gl.RGBA;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                srcFormat, srcType, image);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
}

// Initialize a shader program, so WebGL knows how to draw our data
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

// creates shader, uploads source, and compile
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}



function dec2bin(dec)
{
  let b = (dec >>> 0).toString(2);
  let b_length = 32 - b.length;
  for (var ii = 0; ii < (b_length); ++ii)
  {
    b = '0'+b;
  }
  let bin = "";
  for (var ii = 0; ii < 32; ii+= 4)
  {
    bin = bin + b[ii]+b[ii+1]+b[ii+2]+b[ii+3]+'.';
  }
  return bin;
}

//Heaps Algorithm studd
function Heap(kk, ArrayToPermute)
{
  if (kk == 1)
  {

    let temp_score = Score(deepCopyFunction(ArrayToPermute));
    if( temp_score < lowest_score)
    {
      best_order = [ArrayToPermute[0].id, ArrayToPermute[1].id, ArrayToPermute[2].id, ArrayToPermute[3].id];
      lowest_score = temp_score;
    }

/*     let temp_score = ScoreForMovement(deepCopyFunction(ArrayToPermute));
    if( temp_score > highest_score)
    {
      best_order = [ArrayToPermute[0].id, ArrayToPermute[1].id, ArrayToPermute[2].id, ArrayToPermute[3].id];
      highest_score = temp_score;
    } 
 */

  }
  else
  {
    Heap(kk - 1, ArrayToPermute)

    // Generate permutations for kth swapped with each k-1 initial
    for (let ii = 0; ii < kk-1; ii++)
    {
      // Swap choice dependent on parity of k (even or odd)
      if (kk % 2 == 0)
      {
        let temp = ArrayToPermute[ii];
        ArrayToPermute[ii] = ArrayToPermute[kk-1];
        ArrayToPermute[kk - 1] = temp;
      }
      else
      {
        let temp = ArrayToPermute[0];
        ArrayToPermute[0] = ArrayToPermute[kk-1];
        ArrayToPermute[kk - 1] = temp;

      }
      Heap(kk - 1, ArrayToPermute)
    }

  }
}
        
//Build the exchange look-up table
function InitializeSwitchTable(kk, A)
{
  if (kk == 0)
  {
    
    lowest_score = Score(deepCopyFunction(A));
    best_order = [A[0].id, A[1].id, A[2].id, A[3].id];
    if(lowest_score > 0)
    {
      Heap(4, deepCopyFunction(A));
    }
    
/*    highest_score = ScoreForMovement(deepCopyFunction(A));
    
      best_order = [A[0].id, A[1].id, A[2].id, A[3].id];
      Heap(4, deepCopyFunction(A));
 */
    
    let temp_index = 4*SwitchIndex(deepCopyFunction(A));
    switchTable[temp_index    ] = best_order[0];
    switchTable[temp_index + 1] = best_order[1];
    switchTable[temp_index + 2] = best_order[2];
    switchTable[temp_index + 3] = best_order[3]; 
    
    


  }
  else
  {
    for (let occ0 = 0; occ0 < 2; ++occ0)
    {
      if (occ0 == 0)
      {
        InitializeSwitchTable(kk-1, A.concat({id:4 - kk, occ:occ0, x:0, y:0}));
      }
      else
      {
        for (let x0 = -1; x0 < 2; ++x0)
        {
          for (let y0 = -1; y0 < 2; ++y0)
          {
            InitializeSwitchTable(kk-1, A.concat({id:4 - kk, occ:occ0, x:x0, y:y0}));
  
          }
        }

      }
    
    }

  }
 
}

function SwitchIndex(ArrayToCount)
{
    let switchIndex = 0;
    let ii = 0;
    switchIndex += ArrayToCount[ii].occ*( ArrayToCount[ii].occ + 3*( ArrayToCount[ii].x + 1) + ( ArrayToCount[ii].y + 1))*1000;
    ii = 1;
    switchIndex += ArrayToCount[ii].occ*( ArrayToCount[ii].occ + 3*( ArrayToCount[ii].x + 1) + ( ArrayToCount[ii].y + 1))*100;
    ii = 2;
    switchIndex += ArrayToCount[ii].occ*( ArrayToCount[ii].occ + 3*( ArrayToCount[ii].x + 1) + ( ArrayToCount[ii].y + 1))*10;
    ii = 3;
    switchIndex += ArrayToCount[ii].occ*( ArrayToCount[ii].occ + 3*( ArrayToCount[ii].x + 1) + ( ArrayToCount[ii].y + 1))*1;
    return switchIndex;

}
function Score(ArrayToScore)
{
  
  if( ArrayToScore[0].id % 2 == 1)
     ArrayToScore[0].x +=1;
  if( ArrayToScore[0].id > 1)
     ArrayToScore[0].y += 1;
  
  if( ArrayToScore[1].id % 2 == 0)
     ArrayToScore[1].x -=1;
  if( ArrayToScore[1].id > 1)
     ArrayToScore[1].y += 1;

  if( ArrayToScore[2].id % 2 == 1)
     ArrayToScore[2].x +=1;
  if( ArrayToScore[2].id < 2)
     ArrayToScore[2].y -= 1;

  if( ArrayToScore[3].id % 2 == 0)
     ArrayToScore[3].x -=1;
  if( ArrayToScore[3].id < 2)
     ArrayToScore[3].y -= 1;

  let score = 0;
  for (let ii = 0; ii < ArrayToScore.length; ++ii)
  {
    score +=  ArrayToScore[ii].occ*(Math.abs( ArrayToScore[ii].x) + Math.abs( ArrayToScore[ii].y));
  }

  return score;
}

function ScoreForMovement(ArrayToScore)
{
  let score = 0;
  
  if( ArrayToScore[0].id % 2 == 1)
  {
    let val = Math.abs(ArrayToScore[0].x);
    let val2 = Math.abs(ArrayToScore[0].x + 1);
    let occ = ArrayToScore[0].occ;
    if (val2 < val)
      score += occ*2;
    else if (val == val2)
      score += occ*1;
    else
      score -= occ*1;
  }
     //ArrayToScore[0].x +=1;
  if( ArrayToScore[0].id > 1)
  {
    let val = Math.abs(ArrayToScore[0].y);
    let val2 = Math.abs(ArrayToScore[0].y + 1);
    let occ = ArrayToScore[0].occ;
    if (val2 < val)
      score += occ*2;
    else if (val == val2)
      score += occ*1;
    else
      score -= occ*1;
  }
     //ArrayToScore[0].y += 1;
  
  if( ArrayToScore[1].id % 2 == 0)
  {
    let val = Math.abs(ArrayToScore[1].x);
    let val2 = Math.abs(ArrayToScore[1].x - 1);
    let occ = ArrayToScore[1].occ;
    if (val2 < val)
      score += occ*2;
    else if (val == val2)
      score += occ*1;
    else
      score -= occ*1;
  }
     //ArrayToScore[1].x -=1;
  if( ArrayToScore[1].id > 1)
  {
    let val = Math.abs(ArrayToScore[1].y);
    let val2 = Math.abs(ArrayToScore[1].y + 1);
    let occ = ArrayToScore[1].occ;
    if (val2 < val)
      score += occ*2;
    else if (val == val2)
      score += occ*1;
    else
      score -= occ*1;
  }
    // ArrayToScore[1].y += 1;

  if( ArrayToScore[2].id % 2 == 1)
  {
    let val = Math.abs(ArrayToScore[2].x);
    let val2 = Math.abs(ArrayToScore[2].x + 1);
    let occ = ArrayToScore[2].occ;
    if (val2 < val)
      score += occ*2;
    else if (val == val2)
      score += occ*1;
    else
      score -= occ*1;
  }
     //ArrayToScore[2].x +=1;
  if( ArrayToScore[2].id < 2)
  {
    let val = Math.abs(ArrayToScore[2].y);
    let val2 = Math.abs(ArrayToScore[2].y - 1);
    let occ = ArrayToScore[2].occ;
    if (val2 < val)
      score += occ*2;
    else if (val == val2)
      score += occ*1;
    else
      score -= occ*1;
  }
     //ArrayToScore[2].y -= 1;

  if( ArrayToScore[3].id % 2 == 0)
  {
    let val = Math.abs(ArrayToScore[3].x);
    let val2 = Math.abs(ArrayToScore[3].x - 1);
    let occ = ArrayToScore[3].occ;
    if (val2 < val)
      score += occ*2;
    else if (val == val2)
      score += occ*1;
    else
      score -= occ*1;
  }
     //ArrayToScore[3].x -=1;
  if( ArrayToScore[3].id < 2)
  {
    let val = Math.abs(ArrayToScore[3].y);
    let val2 = Math.abs(ArrayToScore[3].y - 1);
    let occ = ArrayToScore[3].occ;
    if (val2 < val)
      score += occ*2;
    else if (val == val2)
      score += occ*1;
    else
      score -= occ*1;
  }
     //ArrayToScore[3].y -= 1;

/*   let score = 0;
  for (let ii = 0; ii < ArrayToScore.length; ++ii)
  {
    score +=  ArrayToScore[ii].occ*(Math.abs( ArrayToScore[ii].x) + Math.abs( ArrayToScore[ii].y));
  } */

  return score;
}

function deepCopyFunction(inObject)
{
  let outObject, value, key

  if (typeof inObject !== "object" || inObject === null) {
    return inObject // Return the value if inObject is not an object
  }

  // Create an array or object to hold the values
  outObject = Array.isArray(inObject) ? [] : {}

  for (key in inObject) {
    value = inObject[key]

    // Recursively (deep) copy for nested objects, including arrays
    outObject[key] = deepCopyFunction(value)
  }

  return outObject;
}

