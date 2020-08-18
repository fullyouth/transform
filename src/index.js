import Taro, { Component } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import PropTypes from 'prop-types'
import { classNames, styleNames } from '@/utils'
import PromiseQueue from 'easy-promise-queue'
import './index.scss'

function delay(delayTime = 500) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, delayTime)
  })
}

function delayQuerySelector(self, selectorStr, delayTime = 500) {
  const $scope = Taro.getEnv() === Taro.ENV_TYPE.WEB ? self : self.$scope
  const selector = Taro.createSelectorQuery().in($scope)
  return new Promise((resolve) => {
    delay(delayTime).then(() => {
      selector
        .select(selectorStr)
        .boundingClientRect()
        .exec((res) => {
          resolve(res)
        })
    })
  })
}

export default class Transform extends Component {
  static defaultProps = {
    isAnimation: true,
    open: false,
    transDelay: 500,
    transFuncName: 'ease-in-out'
  }

  static propTypes = {
    isAnimation: PropTypes.bool,
    open: PropTypes.bool,
    transDelay: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    transFuncName: PropTypes.string
  }

  constructor(props) {
    super(props)
    this.state = {
      wrapperHeight: 0
    }
    this.isCompleted = true
    this.startOpen = false
    this._key = Date.parse(new Date())
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.open !== this.props.open) {
      this.startOpen = !!nextProps.open && !!nextProps.isAnimation
      this.toggleWithAnimation()
    }
  }

  toggleWithAnimation() {
    if (!this._animationQueue) {
      this._animationQueue = new PromiseQueue({ concurrency: 1 })
    }

    let task = () => {
      return new Promise((r) => {
        const { open, isAnimation } = this.props
        if (!this.isCompleted || !isAnimation) return

        this.isCompleted = false
        delayQuerySelector(this, `.transform__content-${this._key}`, 0).then((rect) => {
          const height = parseInt(rect[0].height.toString())
          const startHeight = open ? height : 0
          const endHeight = open ? 0 : height
          this.startOpen = false
          this.setState(
            {
              wrapperHeight: startHeight
            },
            () => {
              this.setState(
                {
                  wrapperHeight: endHeight
                },
                () => {
                  this.isCompleted = true
                  r()
                }
              )
            }
          )
        })
      })
    }

    this._animationQueue.add(task)
  }

  resolveTranstion = (transDelay, transFuncName) => {
    return `height ${transDelay}ms ${transFuncName};`
  }

  render() {
    const { open, transDelay, transFuncName } = this.props
    const { wrapperHeight } = this.state

    const contentCls = classNames('transform', {
      'transform__inactive': (!open && this.isCompleted) || this.startOpen
    })
    const contentStyle = {
      height: `${wrapperHeight}px`,
      transition: this.resolveTranstion(transDelay, transFuncName)
    }

    if (this.isCompleted) {
      contentStyle.height = ''
    }
    return (
      <View className={contentCls} style={contentStyle}>
        <View className={`transform__content-${this._key}`}>{this.props.children}</View>
      </View>
    )
  }
}
