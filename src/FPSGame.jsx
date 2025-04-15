
// FPSGame: Tarayıcı tabanlı FPS 5v5 oyun (Bot AI + Takım hedefleme + Ses efektleri + Mobil uyum + Ayarlar)
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Sky, useGLTF } from '@react-three/drei';
import { Physics, useBox, usePlane } from '@react-three/cannon';
import { Suspense, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');
let localScore = { kills: 0, deaths: 0 };
let soundEnabled = true;
const shootAudio = new Audio('/sounds/shoot.mp3');
const hitAudio = new Audio('/sounds/hit.mp3');

function BotModel() {
  const { scene } = useGLTF('/models/enemy.glb');
  return <primitive object={scene.clone()} scale={[1.2, 1.2, 1.2]} />;
}

function Bot({ id, position, team, removed, playerPosition, playerTeam, onBotHit }) {
  const [ref, api] = useBox(() => ({ mass: 1, position, args: [1, 2, 1] }));
  const target = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const shootCooldown = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current || removed || !playerPosition || team === playerTeam) return;

    target.current.set(...playerPosition);
    direction.current.subVectors(target.current, ref.current.position).normalize();

    const distance = ref.current.position.distanceTo(target.current);

    if (distance > 3) {
      const speed = 0.03;
      const move = direction.current.clone().multiplyScalar(speed);
      api.position.set(
        ref.current.position.x + move.x,
        ref.current.position.y,
        ref.current.position.z + move.z
      );
    } else if (shootCooldown.current <= 0) {
      if (soundEnabled) shootAudio.play();
      onBotHit();
      shootCooldown.current = 2;
    }

    shootCooldown.current -= delta;
  });

  return (
    <group ref={ref} position={position}>
      <Suspense fallback={null}>
        <BotModel />
      </Suspense>
    </group>
  );
}

function BotMiniMap({ bots }) {
  const size = 150;
  return bots.map((bot) => {
    const x = (bot.position[0] + 50) / 100 * size;
    const y = (bot.position[2] + 50) / 100 * size;
    return (
      <div key={bot.id} style={{ position: 'absolute', left: x, top: y, width: 6, height: 6, background: 'blue', borderRadius: '50%' }} />
    );
  });
}

function MiniMap({ players, bots }) {
  const size = 150;
  return (
    <div style={{ position: 'absolute', top: 10, right: 10, background: '#222', width: size, height: size, border: '2px solid white' }}>
      {Object.entries(players).map(([id, player]) => {
        const x = (player.position[0] + 50) / 100 * size;
        const y = (player.position[2] + 50) / 100 * size;
        return (
          <div key={id} style={{ position: 'absolute', left: x, top: y, width: 6, height: 6, background: 'red', borderRadius: '50%' }} />
        );
      })}
      <BotMiniMap bots={bots} />
    </div>
  );
}

function SettingsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'absolute', bottom: 10, right: 10, color: 'white' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ padding: '8px 12px', background: '#333', color: 'white', border: '1px solid #888', borderRadius: 4 }}>
        ⚙️ Ayarlar
      </button>
      {open && (
        <div style={{ marginTop: 10, background: '#111', padding: 10, border: '1px solid #555' }}>
          <label>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={() => (soundEnabled = !soundEnabled)}
            /> Ses Efektleri
          </label>
        </div>
      )}
    </div>
  );
}
